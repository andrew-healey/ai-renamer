import traverser from "shift-traverser";
import { refactor } from "shift-refactor";
import assert from "node:assert";
import { codeGen } from "shift-codegen";

const { traverse } = traverser;

/*
type Leaf = boolean | (ancestry,node)=>Path[];
type CustomNode = Shift.Node | {type:string};
type Path=CustomNode[];
type PropIdx=string | `...${string}`;
type Name=string|(CustomNode)=>string;
type NodeRule={
	leaf?:Leaf,
	type:string,
	propIdxes?:PropIdx[];
	name?:Name
}
*/

const leaf = true;
const nodeAttributes = {
  IdentifierExpression: {
    leaf,
  },
  StaticMemberExpression: {
    leaf: (ancestry, node) => [
      ...ancestry,
      node,
      { type: "_StaticProperty", value: node.property, pathIdx: 0 },
    ],
    name: "Dot",
    propIdxes: ["object"], // This one's weird since UglifyJS makes both prop and object to index 0.
  },
  LiteralStringExpression: {
    leaf,
    type: "String",
  },
  LiteralNumericExpression: {
    leaf,
    type: "Number",
  },
  LiteralBooleanExpression: {
    leaf,
    type: "Bool",
  },
  LiteralRegExpExpression: {
    leaf,
    type: "RegExp",
    value: (node) => encodeURIComponent(codeGen(node)),
  },
  _StaticProperty: {
    leaf,
    // Leave type undefined, just like identifier expressions.
  },
  CallExpression: {
    name: "Call",
    propIdxes: ["callee", "...arguments"],
  },
  NewExpression: {
    name: "New",
    propIdxes: ["callee", "...arguments"],
  },
  FunctionExpression: {
    name: "Function",
    propIdxes: ["...params"],
  },
  ArrowExpression: {
    name: "Function",
    propIdxes: ["...params"],
  },
  ComputedMemberExpression: {
    name: "Sub",
    propIdxes: ["object", "expression"],
  },
  BinaryExpression: {
    name: (node) => "Binary" + node.operator,
    propIdxes: ["left", "right"],
  },
  AssignmentExpression: {
    name: "Assign=",
    propIdxes: ["binding", "expression"],
  },
  CompoundAssignmentExpression: {
    name: (node) => "Assign" + node.operator,
    propIdxes: ["binding", "expression"],
  },
  UpdateExpression: {
    name: (node) => "UnaryPostfix" + node.operator,
    propIdxes: ["expression"],
  },
  UnaryExpression: {
    name: (node) => "UnaryPrefix" + node.operator,
    propIdxes: ["expression"],
  },
  ConditionalExpression: {
    name: "Conditional",
    propIdxes: ["test", "consequent", "alternate"],
  },
  // TODO the rest
};

export const extractFeats = (sess) => {
  const ast = sess.nodes[0];

  const featureCache = new Map();
  const getFeatureId = (leafNode) => {
    if (leafNode.name === "arguments") debugger;
    // Variable | Shift.Node
    const getVar = (node) => {
      try {
        return sess(node).lookupVariable()[0];
      } catch (err) {
        return undefined;
      }
    };
    const postLookup = getVar(leafNode) ?? leafNode;

    if (featureCache.has(postLookup)) return postLookup;
    const ret = featureCache.size;
    featureCache.set(postLookup, ret);
    return postLookup;
  };

  const relationalFeats = extractRelations(ast, getFeatureId);
  const functionFeats = extractFunctions(sess, getFeatureId);
  const contextFeats = extractContexts(sess, getFeatureId);

  const entries = [...featureCache.entries()];

  const hasTypeAnnotation = (node) => !!nodeAttributes[node.type]?.type;
  const ordering = ([node, orderFound]) =>
    orderFound + (hasTypeAnnotation(node) ? entries.length : 0); // Variables should always be before things with type annotations.

  const reSortedEntries = entries
    .sort((a, b) => ordering(a) - ordering(b))
    .map(([node], idx) => [node, idx]);

  const reSortedMap = new Map(reSortedEntries);

  const relationalsWithId = relationalFeats
    .map(({ a, b, ...rest }) => ({
      a: reSortedMap.get(a),
      b: reSortedMap.get(b),
      ...rest,
    }))
    .filter(({ a, b }) => a < b); // Always put the lower-indexed feature on the left. This has a side effect of putting as few [type]-paths on the left as possible.

  const functionsWithId = functionFeats.map(({ a, b, ...rest }) => ({
    a: reSortedMap.get(a),
    b: reSortedMap.get(b),
    ...rest,
  }));

  const contextsWithId = contextFeats.map(({ n, ...rest }) => ({
    n: n.map((el) => reSortedMap.get(el)),
    ...rest,
  }));

  const allQueries = [
    ...relationalsWithId,
    ...functionsWithId,
    ...contextsWithId,
  ];

  const globalState = sess.session.globalSession; // type GlobalScope
  const globalScope = globalState.lookupTable.scope;

  const features = [...reSortedMap.entries()].map(([nodeOrVar, id]) => {
    const { type } = nodeOrVar;
    const isNode = type !== undefined;
    if (isNode) {
      const { value } = nodeAttributes[type];
      const val = value ? value(nodeOrVar) : nodeOrVar.value;
      return {
        v: id,
        giv: val,
      };
    }
    // Assume it's a variable.
    const isGlobal = globalScope.variableList.includes(nodeOrVar);

    const { references, declarations } = nodeOrVar;
    assert(references, "Looked-up variable should be a Variable.");
    const [refOrDecl] = [...references, ...declarations];
    assert(refOrDecl, "Variable should have at least one reference.");

    const name = sess(refOrDecl.node).print();

    return {
      v: id,
      [isGlobal ? "giv" : "inf"]: name,
    };
  });

  const infQueries = allQueries.filter(
    ({ a, b }) =>
      a === undefined ||
      b === undefined ||
      "inf" in features[a] ||
      "inf" in features[b]
  ); // Exclude all relationships between definitely-valued features--i.e. between two strings.

  return {
    query: infQueries,
    assign: features,
  };
};

const extractRelations = (ast, getFeatureId) => {
  const ancestry = []; // Constant because I'll use mutations for speed. Queue.
  const pathsFound = [];

  traverse(ast, {
    enter: (node, parent) => {
      const addPath = (finalNode = node) =>
        pathsFound.push([...ancestry, finalNode]);

      if (parent) ancestry.push(parent);

      const behavior = nodeAttributes[node.type];
      if (behavior) {
        if (behavior.leaf === true) {
          addPath();
        } else if (typeof behavior.leaf === "function") {
          pathsFound.push(behavior.leaf(ancestry, node));
        }
      }
    },
    leave: () => {
      ancestry.pop();
    },
  });

  // Now, find paths that match each other. This is going to be a tree of specificity.

  // Splitting at any given layer.
  const splitUniques = (paths, matchedUntil) => {
    assert(
      paths.every((p) => p[matchedUntil - 1] === paths[0][matchedUntil - 1]),
      "All paths must be identical until the matchedUntil index."
    );
    const uniqueChildren = new Set(paths.map((p) => p[matchedUntil]));
    return [...uniqueChildren].map((child) =>
      paths.filter((p) => p[matchedUntil] === child)
    );
  };

  const createPathTree = (paths, matchedUntil = 0) => {
    if (paths.length === 1) return paths[0];
    const uniques = splitUniques(paths, matchedUntil);
    return uniques.map((unique) => createPathTree(unique, matchedUntil + 1));
  };

  const pathTree = createPathTree(pathsFound);

  // Pick every pair of paths which can be travelled between with <4 steps.

  const onlyPaths =
    (func) =>
    (...args) => {
      const ret = func(...args);
      return Array.isArray(ret)
        ? ret.filter((possiblePath) => possiblePath[0]?.type !== undefined)
        : ret;
    };

  const getLeavesAtDepth = onlyPaths((lastSharedAncestor, depth) => {
    if (depth === 0) return lastSharedAncestor;
    return Array.isArray(lastSharedAncestor)
      ? lastSharedAncestor.flatMap((child) =>
          getLeavesAtDepth(child, depth - 1)
        )
      : [];
  });

  // Check the last shared ancestor of each path. This lets us check--are we ever matching A-B-C with A-B-D, *instead of* B-C with B-D?
  const getSharedAncestor = (left, right, matchIdx) => {
    const revLeft = [...left].reverse();
    /*
		const stringify=path=>path.map(b=>b.type).join(".")
		console.log(stringify(left));
		console.log(stringify(right));
		console.log("Intended idx:",matchIdx,left[matchIdx].type);
		console.log("-".repeat(20));
		*/
    const ret = revLeft.find(
      (l_node, index) => l_node === right[left.length - index - 1]
    ); // For the last (idx 0) left node, map to the last (length-1) real index.
    return ret;
  };

  const getPairsSharingAncestor = (lastSharedAncestor, ancestorDepth) => {
    const oneToNum = (num) =>
      Array(num)
        .fill(0)
        .map((_, idx) => idx + 1);
    const nodesAtDepths = oneToNum(3).map((depth) =>
      getLeavesAtDepth(lastSharedAncestor, depth)
    );

    return oneToNum(3).flatMap((rightDepth) => {
      const validLeftLengths = oneToNum(4 - rightDepth);
      return validLeftLengths.flatMap((leftDepth) => {
        const leftNodes = nodesAtDepths[leftDepth - 1];
        const rightNodes = nodesAtDepths[rightDepth - 1];
        return leftNodes
          .flatMap((leftNode) => {
            return rightNodes.map((rightNode) => {
              return [leftNode, rightNode, ancestorDepth];
            });
          })
          .filter(
            ([leftNode, rightNode]) =>
              getSharedAncestor(leftNode, rightNode, ancestorDepth) ===
              leftNode[ancestorDepth]
          ); // Only match B-C with B-D, not A-B-C with A-B-D.
      });
    });
  };

  const getAllPairs = (ancestor, depth = 0) => {
    const ownPairs = getPairsSharingAncestor(ancestor, depth);
    const childPairs = Array.isArray(ancestor)
      ? ancestor.flatMap((child) => getAllPairs(child, depth + 1))
      : [];
    return [...ownPairs, ...childPairs];
  };

  const allPairs = getAllPairs(pathTree);

  // TODO stringify all the pairs.

  const pathToString = (truncatedPath) =>
    truncatedPath.flatMap((node, idx) => {
      const attrs = nodeAttributes[node.type];
      if (!attrs) return [];

      const { name, propIdxes } = attrs;

      if (!name || !propIdxes) {
        const { type } = attrs;
        if (type) return ["-", type];
        return []; // In case there's no type, like for identifiers.
      }
      const nameVal = typeof name === "string" ? name : name(node);

      const orderedProps = propIdxes.flatMap((property) => {
        if (property.startsWith("...")) {
          const restedProp = property.slice(3);
          const el = node[restedProp];
          return Array.isArray(el) ? el : el.items ?? el.elements; // TODO define an attribute of, i.e. ArrayExpression, which turns it into an array.
        }
        return [node[property]];
      });

      const myChild = truncatedPath[idx + 1];
      const childIdx = Math.max(0, orderedProps.indexOf(myChild)); // When it's not found, default to zero. This gives [0] for Dot property names.

      return [nameVal, `[${childIdx}]`];
    });

  const reversePath = (path) => {
    const firstIndexing = path.findIndex((stringPart) =>
      stringPart.startsWith("[")
    );
    return path.slice(firstIndexing).reverse();
  };
  const forwardPath = (path) => {
    return path;
  };

  const featureObjs = allPairs
    .map((pair) => {
      const [left, right, ancestorDepth] = pair;
      const truncLeft = left.slice(ancestorDepth);
      const truncRight = right.slice(ancestorDepth);
      const leftPath = reversePath(pathToString(truncLeft)).join("");
      const rightPath = forwardPath(pathToString(truncRight)).join("");
      const relation = `${leftPath}:${rightPath}`;
      return {
        a: left[left.length - 1],
        b: right[right.length - 1],
        fx: relation,
        aPath: pathToString(left).join(""),
        bPath: pathToString(right).join(""),
      };
    })
    .map(({ a, b, fx, ...debug }) => ({
      a: getFeatureId(a),
      b: getFeatureId(b),
      fx,
      //...debug,
    }));
  return featureObjs;
};

const extractFunctions = (sess, getFeatureId) => {
  const $decls = sess("FunctionDeclaration");

  const declRelations = $decls.map((decl) => {
    const { params, name } = decl;
    return {
      params,
      variable: name,
    };
  });

  const $varFuncs = sess(
    "VariableDeclarator > :matches(FunctionExpression, ArrowExpression)"
  ).parents();
  const varDeclRelations = $varFuncs.map((varFunc) => {
    const { binding, init } = varFunc;
    return {
      params: init.params,
      variable: binding,
    };
  });

  const allRelations = [...declRelations, ...varDeclRelations];

  const fnRels = allRelations.flatMap(({ params, variable }) => {
    const paramIds = sess(params)("BindingIdentifier");
    const funcId = getFeatureId(variable);

    const fnPars = paramIds.map((paramId) => ({
      a: getFeatureId(paramId),
      b: funcId,
      fx: "FNPAR",
    }));

    const fnCalls = paramIds
      .filter((paramId) => {
        const [variable] = sess(paramId).lookupVariable();
        const { references } = variable;
        const $refs = sess(references.map((ref) => ref.node));
        const $parents = $refs.parents();
        const $calls = $parents.filter(
          (parent) => parent.type === "CallExpression"
        );
        return $calls.nodes.length > 0;
      })
      .map((paramId) => ({
        a: getFeatureId(paramId),
        b: funcId,
        fx: "FNCALL",
      }));

    return [...fnPars, ...fnCalls];
  });

  return fnRels;
};

const collectVarLists = (scope) => [
  [
    ...scope.variableList.filter(isUseful),
    ...[...scope.through._.values()].map(([reference]) => reference.node),
  ], // Lock down both the scope's *owned variables* and its *referenced* variables.
  ...scope.children.flatMap(collectVarLists),
];

const extractContexts = (sess, getFeatureId) => {
  const globalState = sess.session.globalSession; // type GlobalState
  const globalScope = globalState.lookupTable.scope;
  const variableSets = collectVarLists(globalScope).filter(
    (list) => list.length > 1
  );
  return variableSets.map((variableSet) => ({
    cn: "!=",
    n: variableSet.map(getFeatureId),
  }));
};

const isUseful = (variable) =>
  variable.declarations.length + variable.references.length > 0;

