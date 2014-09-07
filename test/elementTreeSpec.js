var et = require('../lib/elementTree.js'),
    ElementTree = et.ElementTree,
    ElementTreeNode = et.ElementTreeNode,
    should = require('should');

describe("ElementTreeNode", function() {

  describe("()", function() {

    it("should create an empty node", function() {
      var node = new ElementTreeNode();
      node.should.be.ok;
      node.should.have.property('element', null);
      node.should.have.property('children').with.lengthOf(0);
    });

    it("should create a node with an element", function() {
      var node = new ElementTreeNode({});
      node.should.be.ok;
      node.should.have.property('element', {});
      node.should.have.property('children').with.lengthOf(0);
    });

    it("should create a node with children", function() {
      var node = new ElementTreeNode({}, [{ a: 'a' }, { b: 'b' }]);
      node.should.be.ok;
      node.should.have.property('element', {});
      node.should.have.property('children').with.lengthOf(2);
    });

  });

  describe(".addChild()", function() {

    it("should add children to the node", function() {
      var node = new ElementTreeNode();
      node.children.should.have.lengthOf(0);
      node.addChild({ a: 'a' });
      node.children.should.have.lengthOf(1);
      node.addChild({ b: 'b' });
      node.children.should.have.lengthOf(2);
    });

  });

});

describe("ElementTree", function() {

  describe("()", function() {

    it("should create an empty tree", function() {
      var tree = new ElementTree();
      tree.should.be.ok;
      tree.should.have.property('nodes').with.type('object');
      tree.should.have.property('children').with.type('object');
    });

    it("should create a populated tree", function() {
      var elements = [
        { name: 'first' },
        { name: 'second', follow: 'first' }
      ];
      var tree = new ElementTree(elements);
      tree.should.be.ok;
      Object.keys(tree.nodes).should.have.lengthOf(2);
      Object.keys(tree.children).should.have.lengthOf(1);
    });

  });

  describe(".addElement()", function() {

    it("should add an element", function() {
      var tree = new ElementTree();
      tree.should.be.ok;
      tree.addElement({ name: 'first' });
      tree.root.should.have.property('children').with.lengthOf(1);
      tree.root.children[0].element.name.should.equal('first');
    });

    it("should attach orphaned children when parent is added", function() {
      var tree = new ElementTree();
      tree.addElement({ name: 'second', follow: 'first' });
      tree.addElement({ name: 'first' });
      tree.nodes['first'].children.should.have.lengthOf(1);
    });

  });

  describe(".addElements()", function() {

    it("should add multiple elements", function() {
      var elements = [
        { name: 'first' },
        { name: 'second' }
      ];
      var tree = new ElementTree();
      tree.addElements(elements);
      Object.keys(tree.nodes).should.have.lengthOf(2);
      tree.root.should.have.property('children').with.lengthOf(2);
    });

    it("resolve dependencies", function() {
      var elements = [
        { name: 'first' },
        { name: 'second', follow: 'first' }
      ];
      var tree = new ElementTree();
      tree.addElements(elements);
      tree.root.should.have.property('children').with.lengthOf(1);
      tree.root.children[0].element.name.should.equal('first');
      var firstNode = tree.root.children[0];
      firstNode.should.have.property('children').with.lengthOf(1);
      firstNode.children[0].element.name.should.equal('second');
    });

  });

  describe(".addChild()", function() {

    beforeEach(function() {
      this.tree = new ElementTree([{ name: 'first' }]);
      this.child = new ElementTreeNode({ name: 'second', follow: 'first' });
    });

    it("should store children on their parent nodes", function() {
      this.tree.addChild(this.child);
      this.tree.nodes['first']
        .should.have.property('children')
        .with.lengthOf(1);
      this.tree.nodes['first']
        .children[0].element.name
        .should.equal('second');
    });

    it("should store children in the tree's children object", function() {
      this.tree.addChild(this.child);
      this.tree.children['first']
        .should.have.lengthOf(1);
      this.tree.children['first'][0].element.name
        .should.equal('second');
    });

    it("should reject a child that isn't an ElementTreeNode", function() {
      var test = this;
      (function() {
        test.tree.addChild({ name: 'second', follow: 'first' });
      }).should.throw('child must be an ElementTreeNode');
    })

    it("should reject a child that doesn't follow another node", function() {
      var test = this;
      (function() {
        test.tree.addChild(new ElementTreeNode({ name: 'second' }));
      }).should.throw(/cannot add a child/);
    })

  });

});
