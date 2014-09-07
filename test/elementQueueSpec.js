var ElementQueue = require('../lib/elementQueue.js'),
    should = require('should');

describe("ElementQueue", function() {

  describe("()", function() {
    it("should create an empty ElementQueue", function() {
      var e = new ElementQueue();
      e.should.be.ok;
      e.queue.length.should.be.exactly(0);
    })
  });

  describe(".addElement()", function() {
    it("should add elements", function() {
      var e = new ElementQueue();
      e.should.be.ok;
      e.addElement({ name: 'first' });
      e.queue.length.should.be.exactly(1);
      e.queue[0].size().should.be.exactly(1);
    })
  });

  describe(".addElements()", function() {
    it("should add multiple elements", function() {
      var elements = [
        { name: 'first' },
        { name: 'second' }
      ]
      var e = new ElementQueue();
      e.addElements(elements);
      e.queue.length.should.be.exactly(1);
      e.queue[0].size().should.be.exactly(2);
    })
  });

  describe(".addAtIndex()", function() {
    it("should insert at given index", function() {
      var e = new ElementQueue();
      e.should.be.ok;
      var first = { name: 'first' };
      e.addElement(first);
      var second = { name: 'second' };
      e.addAtIndex(second, 1);
      e.queue.length.should.be.exactly(2);
      e.queue[0].size().should.be.exactly(1);
      e.queue[1].size().should.be.exactly(1);
      e.queue[1].contains(second).should.be.ok;
    });
  });

  describe(".adjustFollowers()", function() {
    it("should shuffle followers down the queue", function() {
      var e = new ElementQueue();
      var third = { name: 'third', follow: 'second' };
      e.addElement(third);
      e.queue[0].contains(third).should.be.ok;
      // adding second shuffles third to the second bin
      var second = { name: 'second', follow: 'first' };
      e.addElement(second);
      e.queue.length.should.be.exactly(2);
      e.queue[1].contains(third).should.be.ok;
      // adding what second follows shuffles the other two down
      var first = { name: 'first' };
      e.addElement(first);
      e.queue.length.should.be.exactly(3);
      e.queue[0].contains(first).should.be.ok;
      e.queue[1].contains(second).should.be.ok;
      e.queue[2].contains(third).should.be.ok;
    });

    it("should do nothing if there are no followers", function() {
      var e = new ElementQueue();
      var foo = { name: 'foo' };
      e.addElement(foo);
      e.queue[0].contains(foo).should.be.ok;
      var bar = { name: 'bar' };
      e.addElement(bar);
      e.queue[0].contains(foo).should.be.ok;
      e.queue[0].contains(bar).should.be.ok;
    })
  });

});
