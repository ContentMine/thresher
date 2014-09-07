var ElementTreeNode = function(element, children) {
  this.element = element;
  this.children = children || [];
}

ElementTreeNode.prototype.addChild = function(c) {
  this.children.push(c);
}

var ElementTree = function(elements) {
  this.root = new ElementTreeNode();
  // In addition to being referenced by their parent,
  // every node is stored in the nodes object for O(1)
  // access when adding nodes.
  this.nodes = {};
  // Children of each node are stored in the children
  // object, so children of a node can be accumulated
  // before the node itself has been added
  this.children = {};
  if (elements) {
    this.addElements(elements);
  }
}

ElementTree.prototype.addChild = function(child) {
  if (!(child instanceof ElementTreeNode)) {
    throw new Error("child must be an ElementTreeNode");
  }
  if (!child.element.hasOwnProperty('follow')) {
    throw new Error("cannot add a child whose element doesn't" +
                    "have the 'follow' property");
  }
  // If the parent doesn't already have a child array, create it
  var parentName = child.element.follow;
  if (!this.children[parentName]) {
    this.children[parentName] = [];
  }
  // Add the child to the parent's child array,
  // both in the tree's children object
  this.children[parentName].push(child);
  // and directly in the parent node
  if (this.nodes.hasOwnProperty(parentName)) {
    this.nodes[parentName].addChild(child);
  }
}

// Add an element to the tree
ElementTree.prototype.addElement = function(e) {
  var tree = this;
  var node = new ElementTreeNode(e);
  tree.nodes[e.name] = node;
  if (tree.children.hasOwnProperty(e.name)) {
    node.children = tree.children[e.name];
  }
  if (e.hasOwnProperty('follow')) {
    tree.addChild(node);
  } else {
    tree.root.addChild(node);
  }
}

// Add multiple elements to the tree
ElementTree.prototype.addElements = function(elements) {
  elements.forEach(this.addElement, this);
}

module.exports = {
  ElementTree: ElementTree,
  ElementTreeNode: ElementTreeNode
}
