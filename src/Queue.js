/*
 * The Queue class is extracted and modified from https://github.com/petkaantonov/deque which is 
 * Copyright (c) 2013 Petka Antonov and licensed under the MIT license
 */

var Queue = (function(){

function Queue() {
	this._capacity = 16;
	this._length = 0;
	this._front = 0;
}

Queue.prototype.push = function(item) {
	var length = this._length;
	checkCapacity(this, length + 1);
	var i = (this._front + length) & (this._capacity - 1);
	this[i] = item;
	this._length = length + 1;
};

Queue.prototype.shift = function() {
	var length = this._length;
	if (length === 0) {
		return void 0;
	}
	var front = this._front;
	var ret = this[front];
	this[front] = void 0;
	this._front = (front + 1) & (this._capacity - 1);
	this._length = length - 1;
	return ret;
};

Queue.prototype.size = function() {
	return this._length;
};

function checkCapacity(q, size) {
	if (q._capacity < size) {
		resizeTo(q, getCapacity((q._capacity + (q._capacity >> 1)) + 16));
	}
}

function resizeTo(q, capacity) {
	var oldCapacity = q._capacity;
	q._capacity = capacity;
	var front = q._front;
	var length = q._length;
	if (front + length > oldCapacity) {
		var moveItemsCount = (front + length) & (oldCapacity - 1);
		arrayMove(q, 0, q, oldCapacity, moveItemsCount);
	}
}

function arrayMove(src, srcIndex, dst, dstIndex, len) {
	for (var j = 0; j < len; ++j) {
		dst[j + dstIndex] = src[j + srcIndex];
		src[j + srcIndex] = void 0;
	}
}

function pow2AtLeast(n) {
	n = n >>> 0;
	n = n - 1;
	n = n | (n >> 1);
	n = n | (n >> 2);
	n = n | (n >> 4);
	n = n | (n >> 8);
	n = n | (n >> 16);
	return n + 1;
}

function getCapacity(capacity) {
	return pow2AtLeast(
		Math.min(Math.max(16, capacity), 1073741824)
	);
}

return Queue;
}());

