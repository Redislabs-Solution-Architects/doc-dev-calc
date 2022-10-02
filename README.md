# Redis Document (JSON/Search) Dev Savings Calculator

## Summary
This is a tool to show the software development costs that can be achieved using the Redis Stack features of Search and JSON instead of manual methods with
hash and sorted sets.
___
## Features
- Calculates development savings (time + money) Redis JSON vs Hash Sets and RediSearch vs Sorted Sets for secondary indices
___
## Prerequisites
- HTML Browser
___
## Background

### Dev Cost
#### Inputs
- Developer Cost.  Annual, fully-loaded cost for a developer.
- LOC per Developer.  Annual lines of code produced by a developer.
- Maintenance %.  Total software maintenance cost expressed as a percentage of the development cost.
___
### Redis JSON
This block calculates the savings (time + money) that could be achieved by using Redis JSON instead Hash Sets.  While Hash Sets work great for simple data structures, nested data structures add significant complexity to the development process.
#### Examples
##### Data
```json
{
    "level-0": "value-0",

    "level-1": {
            "level-1-1": "value-1-1"
    },

    "level-2": {
                "level-2-1": "value-2-1",
                "level-3": {
                    "level-3-1": "value-3-1"
                }
    }
}
```
##### Hash Setter - Javascript
```javascript
//SLOC = n+1

//nesting depth = 0
await client.hSet('outer1', 'field', 'val');

//nesting depth = 1
await client.hSet('inner1', 'field', 'val');
await client.hSet('outer1', 'inner','inner1');

//nesting depth = 2
await client.hSet('inner2', 'field', 'val');
await client.hSet('inner1', 'inner', 'inner2');
await client.hSet('outer1', 'inner','inner1');

//nesting depth = n
await client.hSet('inner<n>', 'field', 'val');
await client.hSet('inner<n-1>', 'inner', 'inner<n>');
.
.
.
await client.hSet('outer1', 'inner', 'inner1');
```
##### JSON Setter - Javascript
```javascript
//SLOC = 1

//nesting depth = 0
await client.json.set('outer1', '.', {'field': 'val'});

//nesting depth = 1
await client.json.set('outer1', '.', {'inner1' : {'field': 'val'}});

//nesting depth = 2
await client.json.set('outer1', '.', {'inner1' : {'inner2': {'field': 'val'}}});

//nesting depth = n
await client.json.set('outer1', '.', {'inner1' : {'inner<n-1>': {'inner<n>':{'field': 'val'}}}});
```
##### Hash Getter - Javascript
```javascript
//SLOC = n+1
//nesting depth = 0
return await client.hGet('outer1', 'field');

//nesting depth = 1
let result = await client.hGet('outer1', 'inner');  //result = inner1
return await client.hGet(result, 'field');

//nesting depth = 2
let result = await client.hGet('outer1', 'inner');  //result = inner1
result = await client.hGet(result, 'inner'); //result = inner2
return await client.hGet(result, 'field');

//nesting depth = n
let result = await client.hGet('outer1', 'inner');  //result = inner1
result = await client.hGet(result, 'inner'); //result = inner2
.
.
.
return await client.hGet(result, 'field');
```
##### JSON Getter - Javascript
```javascript
//SLOC = 1

//nesting depth = 0
return await client.json.get('outer1', '.field');

//nesting depth = 1
return await client.json.get('outer1', '.inner1.field');

//nesting depth = 2
return await client.json.get('outer1', '.inner1.inner2.field');

//nesting depth = n
return await client.json.get('outer1', '.inner1.inner<n-1>...inner<n>.field');
```
#### Inputs
- Nesting Levels.  Average depth of data structure nesting in application
- Nested Fields.  Number of fields that have nested data structures
___
### RediSearch
This block calculates the savings that can be achieved by using the inherent indexing functionality of RediSearch vs.
constructing a secondary data structure via sorted sets for indices.  That method entails significant overhead in both of lines of code and control paths (cyclomatic complexity).  I use the product of SLOC and cyclomatic complexity to assign an overall value to costs associated with sorted set indices.
#### Examples
##### Index Creation - Sorted Sets
```javascript
//indexed fields = 1
await client.hSet('record:1', {field1: 'abc'});
await client.zAdd('idx-field1',[{score: 0, value: 'abc:1'}]);


//indexed fields = 2, records = 2
await client.hSet('record:1', {field1: 'abc', field2: 'def'});
await client.hSet('record:2', {field1: 'ghi', field2: 'jkl'});
await client.zAdd('idx-field1', [
    { score: 0, value: 'abc:1' },
    { score: 0, value: 'ghi:2' }
]);
await client.zAdd('idx-field2', [
    { score: 0, value: 'def:1' },
    { score: 0, value: 'jkl:2' }
]);


//indexed fields = m, records = n.  SLOC (commands) = m
await client.hSet('record:1', { field1: 'abc', ... field<m>: 'val' });
.
.
.
await client.hSet('record:<n>', { field1: 'val1', ... field<m>: 'val' });

await client.zAdd('idx-field1', [
    { score: 0, value: 'abc:1' },
    .
    .
    .
    { score: 0, value: '<val>:<n>' }
]);
.
.
.
await client.zAdd('idx-field<m>', [
    .
    .
    .
    { score: 0, value: '<val>:<n>'}
]);
```
##### Index Creation - RediSearch
```javascript
//fields = m, records = n

await client.json.set('record:1', '.', {"field1": "abc", "field2": "123", ... "field<m>": "val"});
await client.json.set('record:2', '.', {"field1": "xyz", "field2": "456", ... "field<m>": "val"});
.
.
.
await client.json.set('record:<n>', '.', {"field1": "val1", "field2": "val2", ... "field<m>": "val"});

//index  SLOC (commands) = 1
await client.ft.create('idx', {
    '$.field1': {
        type: SchemaFieldTypes.TEXT,
        AS: 'field1'
    },
    '$.field2': {
        type: SchemaFieldTypes.TEXT,
        AS: 'field2'
    }, 
    .
    .
    .
    '$.field<m>': {
        type: SchemaFieldTypes.TEXT,
        AS: 'field<m>'
    }, {
        ON: 'JSON',
        PREFIX: 'record:'
    }
});
```
##### Index Maintenance (updates) - Sorted Sets
```javascript
//field value change, SLOC = 19, CC = 2, Product = 38
    let done = false;
    while (!done) {
        try {   
            await client.watch('record:1', 'idx-field1');
            const newVal = 'ddd';
            const oldVal = await client.hGet('record:1', 'field1');
            const multi = await client.multi()
                .hSet('record:1', {field1: newVal})
                .zRem('idx-field1', `${oldVal}:1`)
                .zAdd('idx-field1', [{score: 0, value:`${newVal}:1`}])
            await multi.exec();
            done = true;
        } 
        catch (err) {
            if (err instanceof WatchError) {
                // the transaction aborted
            }
        }
    }
```
##### Index Maintenance - RediSearch
SLOC = 0.  Index maintains itself during field value changes.

##### Equality Search - Sorted Sets
```javascript
//SLOC = 6, Cyclomatic complexity = 2, Product = 12
let records = []
for await (const { score, value } of client.zScanIterator('idx-field1', { MATCH: 'abc:*'})) {
    let id = value.split(':')[1];
    let record = await client.hGetAll(`record:${id}`);
    records.push(record);
}
```
##### Equality Search - RediSearch
```javascript
//SLOC = 1 
await client.ft.search('idx', '@field1:abc');
```
##### Range Search - Sorted Sets
```javascript
//SLOC = 7, Cyclomatic complexity = 2, Product = 14
let vals = await client.zRangeByLex('idx-field1', '[ab', '(b');
let records = [];
for (let i=0; i < vals.length; i++) {
    let id = vals[i].split(':')[1];
    let record = await client.hGetAll(`record:${id}`);
    records.push(record);
}
```
##### Range Search - RediSearch
```javascript
//SLOC = 1
ft.search idx '@field1:ab*'
```
##### Intersection Search (Logical AND) - Sorted Sets
```javascript
//SLOC = 14, Cyclomatic complexity = 5, Product = 60
let ids1 = []
for await (const { score, value } of client.zScanIterator('idx-field1', { MATCH: 'abc:*'})) {
    ids1.push(value.split(':')[1]);
}
    
let ids2 = []
for await (const { score, value } of client.zScanIterator('idx-field2', { MATCH: 'def:*'})) {
    ids2.push(value.split(':')[1]);
}
    
let intersection = ids1.filter(x => ids2.includes(x));
let records = [];
for (let id of intersection) {
    let record = await client.hGetAll(`record:${id}`);
    records.push(record);
} 
```
##### Intersection Search (Logical AND) - RediSearch
```javascript
//SLOC = 1
await client.ft.search idx  '(@field1:abc) (@field2:def)'
```
##### Union Search (Logical OR) - Sorted Sets
```javascript
//SLOC = 12, Cyclomatic complexity = 3, Product = 36
let ids = []
for await (const { score, value } of client.zScanIterator('idx-field1', { MATCH: 'abc:*'})) {
    ids.push(value.split(':')[1]);
}
    
for await (const { score, value } of client.zScanIterator('idx-field2', { MATCH: 'jkl:*'})) {
    ids.push(value.split(':')[1]);
}
    
let records = [];
for (let id of ids) {
    let record = await client.hGetAll(`record:${id}`);
    records.push(record);
} 
```
##### Union Search (Logical OR) - RediSearch
```javascript
//SLOC = 1
await client.ft.search idx  '(@field1:abc) | (@field2:jkl)'
```
#### Inputs
- Fields.  Number of fields in record.
- Maint Ops.  Number of unique field updates.
- Search - Equality.  Number of unique searches on field equality.
- Search - Range.  Number of unique range searches.
- Search - Intersection.  Number of unique field interaction searches.
- Search - Union.  Number of unique field union searches.

## Usage
Open browser to index.html.