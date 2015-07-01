/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var TestUtils = require("./test-utils").TestUtils;

var Ignite = require(TestUtils.scriptPath());
var Entry = Ignite.Entry;

var assert = require("assert");

testPutGet = function() {
    startTest("mycache", {trace: [put, getExist], entry: ["key" , "6"]});
}

testPutContains = function() {
    startTest("mycache", {trace: [put, containsKey], entry: ["key" , "6"]});
}

testContains = function() {
    startTest("mycache", {trace: [notContainsKey], entry: ["key" , "6"]});
}

testRemove = function() {
    startTest("mycache", {trace: [put, getExist, remove, getNonExist], entry: ["key" , "6"]});
}

testRemoveNoKey = function() {
    startTest("mycache", {trace: [remove, getNonExist], entry: ["key" , "6"]});
}

testPutAllGetAll = function() {
    entries = [];

    entries.push(new Entry("key1", "val1"));
    entries.push(new Entry("key2", "val2"));

    startTest("mycache", {trace: [putAll, getAll], entry: entries});
}

testPutAllObjectGetAll = function() {
    entries = [];

    var key1 = {"name" : "Ann"};
    var key2 = {"name" : "Paul"};
    var val1 = {"age" : 12, "books" : ["1", "Book"]};
    var val2 = {"age" : 13, "books" : ["1", "Book"]};

    entries.push(new Entry(key1, val1));
    entries.push(new Entry(key2, val2));

    startTest("mycache", {trace: [putAll, getAll], entry: entries});
}

testRemoveAllObjectGetAll = function() {
    entries = [];

    var key1 = {"name" : "Ann"};
    var key2 = {"name" : "Paul"};
    var val1 = {"age" : 12, "books" : ["1", "Book"]};
    var val2 = {"age" : 13, "books" : ["1", "Book"]};

    entries.push(new Entry(key1, val1));
    entries.push(new Entry(key2, val2));

    startTest("mycache", {trace: [putAll, getAll, removeAll, getNone], entry: entries});
}

testRemoveAll = function() {
    entries = [];

    entries.push(new Entry("key1", "val1"));
    entries.push(new Entry("key2", "val2"));

    startTest("mycache", {trace: [putAll, getAll, removeAll, getNone], entry: entries});
}

testIncorrectCacheName = function() {
    startTest("mycache1", {trace: [incorrectPut], entry: ["key", "6"]});
}

function startTest(cacheName, testDescription) {
    TestUtils.startIgniteNode(onStart.bind(null, cacheName, testDescription));
}

function onStart(cacheName, testDescription, error, ignite) {
    var cache = ignite.cache(cacheName);
    callNext();

    function callNext(error) {
        assert(!error);
        var next = testDescription.trace.shift();
        if (next)
            next.call(null, cache, testDescription.entry, callNext);
        else
            TestUtils.testDone();
    }
}

function put(cache, entry, next) {
    cache.put(entry[0], entry[1], next);
}

function containsKey(cache, entry, next) {
    cache.containsKey(entry[0], onContainsKey);

    function onContainsKey(err, val) {
        assert(err === null, "Error on contains key [err=" + err + "]");
        assert(val === true, "Incorrect result [expected=" + true + ", val=" + val + "]");

        TestUtils.testDone();
    }
}

function notContainsKey(cache, entry, next) {
    cache.containsKey(entry[0], onContainsKey);

    function onContainsKey(err, val) {
        assert(err === null, "Error on contains key [err=" + err + "]");
        assert(val === false, "Incorrect result [expected=" + false + ", val=" + val + "]");

        TestUtils.testDone();
    }
}

function getExist(cache, entry, next) {
    var key = Object.keys(entry)[0];

    cache.get(entry[0], onGet);

    function onGet(error, value) {
        assert(!error);
        assert(value === entry[1]);
        next();
    }
}

function remove(cache, entry, next) {
    cache.remove(entry[0], next);
}

function getNonExist(cache, entry, next) {
    cache.get(entry[0], onGet);

    function onGet(error, value) {
        assert(!error);
        assert(!value);
        next();
    }
}

function putAll(cache, entries, next) {
    cache.putAll(entries, next);
}

function getAll(cache, entries, next) {
    var keys = []

    for (var entry of entries) {
        keys.push(entry.key());
    }

    cache.getAll(keys, onGetAll.bind(null, keys));

    var expected = entries;

    function onGetAll(keys, error, values) {
        assert(!error, error);

        assert(values.length === keys.length, "Values length is incorrect "
            + "[expected=" + keys.length + ", real=" + values.length + "]");

        for (var i = 0; i < keys.length; ++i) {
            var key = keys[i];

            var foundVal = null;

            for (var j = 0; j < values.length; ++j) {
                if (TestUtils.compareObject(key, values[j].key())) {
                    foundVal = values[j];
                }
            }

            var foundExp = null;

            for (var j = 0; j < expected.length; ++j) {
                if (TestUtils.compareObject(key, expected[j].key())) {
                    foundExp = expected[j];
                }
            }

            assert(foundVal !== null, "Cannot find key. [key=" + key + "].");
            assert(foundExp !== null, "Cannot find key. [key=" + key + "].");

            assert(TestUtils.compareObject(foundExp, foundVal), "Incorrect value");
        }

        next();
    }
}

function removeAll(cache, entries, next) {
    cache.removeAll(Object.keys(entries), next)
}

function getNone(cache, entries, next) {
    cache.getAll(Object.keys(entries), onGetAll);

    function onGetAll(error, values) {
        assert(!error, error);
        assert(!values || !Object.keys(values).length);

        next();
    }
}

function incorrectPut(cache, entry, next) {
    cache.put(entry[0], entry[1], callback);

    function callback(error) {
        assert(!!error, "Do not get error for not exist cache");
        assert(error.indexOf("Failed to find cache for given cache name") !== -1,
            "Incorrect message on not exist cache. " + error);

        next();
    }
}