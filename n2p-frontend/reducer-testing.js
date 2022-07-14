import traverser from "shift-traverser";
import { refactor } from "shift-refactor";
import { readFileSync } from "node:fs";
import assert from "node:assert";

const { traverse } = traverser;

console.log(traverse);

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

const extractFeats=(ast)=>{
	const sess=refactor(ast);

  const featureCache = new Map();
  const getFeatureId = (leafNode) => {
		// Variable | Shift.Node
		const postLookup=(sess(leafNode).lookupVariables().get(0)) ?? leafNode;

    if (featureCache.has(postLookup)) return featureCache.get(postLookup);
    const ret = featureCache.size;
    featureCache.set(postLookup, ret);
    return ret;
  };

	const relationalFeats=extractRelations(ast,getFeatureId);
	// TODO make function features.
};

const extractRelations= (ast,getFeatureId) => {
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
          behavior.leaf(ancestry, node).forEach(addPath);
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
    console.log(uniques);
    return uniques.map((unique) => createPathTree(unique, matchedUntil + 1));
  };

  const pathTree = createPathTree(pathsFound);

  console.log(JSON.stringify(pathTree));

  // Pick every pair of paths which can be travelled between with <4 steps.

  const getLeavesAtDepth = (lastSharedAncestor, depth) => {
    if (depth === 0) return lastSharedAncestor;
    return lastSharedAncestor.flatMap((child) =>
      getLeavesAtDepth(child, depth - 1)
    );
  };

  const getPairsSharingAncestor = (lastSharedAncestor, ancestorDepth) => {
    const oneToNum = (num) =>
      Array(num)
        .fill(0)
        .map((_, idx) => idx + 1);
    const nodesAtDepths = oneToNum(3).map((depth) =>
      getLeavesAtDepth(pathTree, depth)
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
    const childPairs = ancestor.flatMap((child) =>
      getAllPairs(child, depth + 1)
    );
    return [...ownPairs, ...childPairs];
  };

  const allPairs = getAllPairs(pathTree);

  // TODO stringify all the pairs.

  const pathToString = (truncatedPath) =>
    path.flatMap((node, idx) => {
      const attrs = nodeAttributes[node.type];
      if (!attrs) return [];

      const { name, propIdxes } = attrs;

      if (!name || !propIdxes) {
        const { type } = node;
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

      const myChild = path[idx + 1];
      const childIdx = Math.max(0, path.indexOf(myChild)); // When it's not found, default to zero. This gives [0] for Dot property names.

      return [nameVal, `[${childIdx}]`];
    });

  const reversePath = (path) => {
    const firstIndexing = path.findIndex((stringPart) =>
      stringPart.startsWith("[")
    );
    return path.slice(firstIndexing).reverse();
  };
  const forwardPath = (path) => {
    const firstIndexing = path.findIndex((stringPart) =>
      stringPart.startsWith("[")
    );
    return path.slice(firstIndexing + 1);
  };

  const featureObjs = allPairs
    .map((pair) => {
      const [left, right, ancestorDepth] = pair;
      const truncLeft = left.slice(ancestorDepth);
      const truncRight = right.slice(ancestorDepth);
      const leftPath = reversePath(pathToString(truncLeft));
      const rightPath = forwardPath(pathToString(truncRight));
      const relation = `${leftPath}:${rightPath}`;
      return {
        a: left[left.length - 1],
        b: right[right.length - 1],
        fx: relation,
      };
    })
    .map(({ a, b, fx }) => ({
      a: getFeatureId(a),
      b: getFeatureId(b),
      fx,
    }));
	
	
};

getPath(ast);
