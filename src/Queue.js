/*
 * Copyright 2018-2019 Opatomic
 * Open sourced with ISC license. Refer to LICENSE for details.
 */

/**
 * @constructor
 * @extends Array
 * @ignore
 */
function QChunk() {}
/** @type {QChunk} */
QChunk.prototype.next;
/** @type {number} */
QChunk.prototype.head;
/** @type {number} */
QChunk.prototype.used;

/**
 * Queue that allocates arrays in small chunks as needed. Chunks are stored as linked list.
 * This design is efficient because it does not require growing arrays and copying data when
 * capacity is exceeded. Also, large contiguous chunks of memory are not required.
 * If only 1 chunk is needed, then it is utilized as a circular array to avoid constantly
 * reallocating a new chunk.
 * @constructor
 * @template T
 */
function Queue() {
	/** @type {number} */
	this.totlen = 0;
	/** @type {!QChunk} */
	this.head = newQChunk(this.newChunkSize, null);
	/** @type {!QChunk} */
	this.tail = this.head;
}

/**
 * @ignore
 * @param {number} size - size of chunk's array
 * @param {QChunk} prev - link to previous chunk
 * @return {!QChunk}
 */
function newQChunk(size, prev) {
	var c = /** @type {!QChunk} */ (new Array(size));
	c.next = null;
	c.head = 0;
	c.used = 0;
	if (prev) {
		prev.next = c;
	}
	return c;
}

/**
 * Add the specified element to the tail of the queue
 * @param {T} item
 * @return {number} new length after adding item
 */
Queue.prototype.push = function(item) {
	var chunk = this.tail;
	if (chunk.used + 1 >= chunk.length) {
		this.tail = chunk = newQChunk(this.newChunkSize, chunk);
	}
	chunk[(chunk.head + chunk.used) & (chunk.length - 1)] = item;
	chunk.used++;
	return ++this.totlen;
};

/**
 * Remove an item from the head of the queue
 * @return {T} The first item in the queue or undefined if queue is empty
 */
Queue.prototype.shift = function() {
	var chunk = this.head;
	if (chunk.used == 0) {
		return undefined;
	}
	var idx = chunk.head;
	var item = chunk[idx];
	chunk[idx] = undefined;
	chunk.used--;
	if (chunk.used == 0 && chunk.next) {
		this.head = chunk.next;
	} else {
		chunk.head = (idx + 1) & (chunk.length - 1);
	}
	this.totlen--;
	return item;
};

/**
 * @return {number}
 */
Queue.prototype.size = function() {
	return this.totlen;
};

/**
 * size of each new array chunk. must be greater than 0 and a power of 2!
 * @type {number}
 */
Queue.prototype.newChunkSize = 64;

