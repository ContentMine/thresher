// # ElementQueue
var Set = require('set');
var _ = require('lodash');

var ElementQueue = function() {
  this.queue = [];
  this.followed = new Set();
  this.followers = {};
}

ElementQueue.prototype.addElements = function(e) {
  e.forEach(this.addElement, this);
}

// Add an element to the queue, ensuring that it
// is placed in a later bin in the queue than any element
// it depends on, and an earlier bin in the queue than any
// element that depends on it.
ElementQueue.prototype.addElement = function(e) {
  var eq = this;
  // We keep track of which elements
  // are followed by others, so we can rapidly
  // decide which ones needs adjusting in the queue
  // during adding
  if (e.hasOwnProperty('follow')) {
    eq.followed.add(e.follow);
    if (eq.followers[e.follow]) {
      eq.followers[e.follow].push(e);
    } else {
      eq.followers[e.follow] = [e];
    }
  } else {
    // Elements that don't follow any other
    // elements can be placed in the first bin
    eq.addAtIndex(e, 0);
    return;
  }
  // Elements that follow other elements must be
  // in a later bin than their dependency
  var dep = e.follow;
  added = false;
  if (eq.queue.length > 0
    && eq.queue[0].size() > 0) {
    eq.queue.forEach(function(bin, i) {
      Object.keys(bin).forEach(function(f) {
        if (f.name == dep) {
          // The dependency is in this bin, so the element
          // should be added to the next bin
          eq.addAtIndex(e, i + 1);
          added = true;
        }
      });
    });
  }
  // If the followed element is not present, we add
  // the element to the first bin
  if (!added) {
    eq.addAtIndex(e, 0);
  }
}

// If an element has followers, check whether the followers
// are in later bins than the element. If not, bump them down
// the queue, creating a bin for them if necessary.
ElementQueue.prototype.adjustFollowers = function(e, i) {
  var elementqueue = this;
  // We only adjust elements that have followers
  if (!elementqueue.followed.contains(e.name)) {
    return;
  }
  var followers = elementqueue.followers[e.name];
  elementqueue.queue.slice(0, i + 1).forEach(function(bin) {
    followers.forEach(function(follower) {
      if (bin.contains(follower)) {
        // Follower is in a bin before or the same position
        // as the element it follows. Bump it down
        // the queue.
        bin.remove(follower);
        elementqueue.addAtIndex(follower, i + 1);
      }
    });
  });
}

// Add an element to the bin in the specified queue position.
// If no such position exists, create it and add the element.
ElementQueue.prototype.addAtIndex = function(e, i) {
  if ((this.queue.length - 1) < i) {
    this.queue[i] = new Set();
  }
  this.queue[i].add(e);
  // When an element is added, we have to make sure
  // any followers are in later bins
  this.adjustFollowers(e, i);
}

module.exports = ElementQueue;
