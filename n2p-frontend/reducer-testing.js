import traverser from "shift-traverser";
import { refactor } from "shift-refactor";
import { readFileSync } from "node:fs";
import assert from "node:assert";
import { codeGen } from "shift-codegen";

const { traverse } = traverser;

const sample = readFileSync("./tests/escape_backslash.js", "utf8");

const sess = refactor(sample);
const ast = sess.nodes[0];

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

const extractFeats = (ast) => {
  const sess = refactor(ast);

  const featureCache = new Map();
  const getFeatureId = (leafNode) => {
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
  // TODO make function features.

  const entries = [...featureCache.entries()];

	const hasTypeAnnotation=(node)=>!!(nodeAttributes[node.type]?.type);
  const ordering = ([node, orderFound]) =>
    orderFound + (hasTypeAnnotation(node) ? entries.length: 0); // Variables should always be before things with type annotations.

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

  const globalState = sess.session.globalSession; // type GlobalScope

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
    const isGlobal = globalState.variables.has(nodeOrVar);

    const { references } = nodeOrVar;
    if (!references) debugger;
    const [reference] = references;
    assert(reference, "Variable should have at least one reference.");

    const name = sess(reference.node).print();

    return {
      v: id,
      [isGlobal ? "giv" : "inf"]: name,
    };
    debugger;
  });

  return {
    query: relationalsWithId,
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
        return leftNodes.flatMap((leftNode) => {
          return rightNodes.map((rightNode) => {
            return [leftNode, rightNode, ancestorDepth];
          });
        });
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
          return node[restedProp];
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
    const firstIndexing = path.findIndex((stringPart) =>
      stringPart.startsWith("[")
    );
    return path.slice(firstIndexing - 1);
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
      ...debug,
    }));
  return featureObjs;
};

console.log(extractFeats(ast));
