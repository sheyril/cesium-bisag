// TODO: Change EventListener to ending motion of camera, NOT just moving
//Increase frame distance of camera proportionally to the rect box vertices distance from cameras position
'use strict';
class Node
{
    constructor(data)
    {
        this.data = data;
        this.left = null;
        this.right = null;
    }
}


Node.prototype.isLess = function(node2)    {
    if(this.data < node2.data)  {
        return true;
    }
    else {
        return false;
    }
}

Node.prototype.isGreater = function(node2) {
    if(this.data > node2.data)  {
        return true;
    }
    else {
        return false;
    }
}

class BST
{
    constructor()
    {
        this.root = null;
    }
}

BST.prototype.insert = function(data) {
    let newNode = new Node(data);
    if(this.root === null)
        this.root = newNode;
    else
        this.insertNode(this.root, newNode);
}

BST.prototype.insertNode = function(node, newNode) {
    if(newNode.isLess(node))
    {
        if(node.left === null)
            node.left = newNode;
        else
            this.insertNode(node.left, newNode);
    }
    else
    {
        if(node.right === null)
            node.right = newNode;
        else
            this.insertNode(node.right,newNode);
    }
}

BST.prototype.findMinNode = function(node)
{
    if(node.left === null)
        return node;
    else
        return this.findMinNode(node.left);
}

BST.prototype.remove = function(data)
{
    let key = new Node(data);
    this.root = this.removeNode(this.root, data);
}

BST.prototype.removeNode = function(node, key)
{
    if(node === null)
        return null;
    else if(key.isLess(node))
    {
        node.left = this.removeNode(node.left, key);
        return node;
    }
    else if(key.isGreater(node))
    {
        node.right = this.removeNode(node.right, key);
        return node;
    }
    else
    {
        if(node.left === null && node.right === null)
        {
            node = null;
            return node;
        }
        if(node.left === null)
        {
            node = node.right;
            return node;
        }
        else if(node.right === null)
        {
            node = node.left;
            return node;
        }
        let aux = this.findMinNode(node.right);
        node.data = aux.data;

        node.right = this.removeNode(node.right, aux.data);
        return node;
    }

}

BST.prototype.searchNode = function(node, key)  {
    if(node === null)
        return null;
    else if(key.isLess(node))   {
        return this.searchNode(node.left, key);
    }
    else if(key.isGreater(node))    {
        return this.searchNode(node.right, key);
    }
    else {
        return node;
    }
}

BST.prototype.search = function(data) {
    let key = new Node(data);
    // let searched = this.searchNode(this.root, key);
    let searched;
    if((searched=this.searchNode(this.root,key)) === null) {
        return null;
    }
    else {
        return searched.data;
    }
}

BST.prototype.inorder = function(node)
{
    if(node !== null)
    {
        this.inorder(node.left);
        console.log(node.data);
        this.inorder(node.right);
    }
}

BST.prototype.getRootNode = function()
{
    return this.root;
}

class NodeSource {
    constructor(data)   {
        this.data = data;
        this.left = null;
        this.right = null;
    }
}

NodeSource.prototype.isLess = function(node2) {
    // console.log('in isLess');
    if(this.data.zoom_level < node2.data.zoom_level)    {
        return true;
    }
    else if(this.data.zoom_level === node2.data.zoom_level) {
        if(this.data.min_x < node2.data.min_x)    {
            return true;
        }
        else if(this.data.min_x === node2.data.min_x) {
            if(this.data.min_y < node2.data.min_y)
                return true;
            else {
                return false;
            }
        }
        else {
            return false;
        }
    }
    else    {
        return false;
    }
}

NodeSource.prototype.isGreater = function(node2) {
    if(this.data.zoom_level > node2.data.zoom_level)  {
        return true;
    }
    else if(this.data.zoom_level === node2.data.zoom_level) {
        if(this.data.min_x > node2.data.min_x)    {
            return true;
        }
        else if(this.data.min_x === node2.data.min_x) {
            if(this.data.min_y > node2.data.min_y)
                return true;
            else
                return false;
        }
        else {
            return false;
        }
    }
    else    {
        return false;
    }
}

class sourcesBST extends BST    {
    constructor()
    {
        super();
    }
}

sourcesBST.prototype.search = function(data)    {
    let key = new NodeSource(data);
    // let searched = this.searchNode(this.root, key);
    let searched;
    if((searched=this.searchNode(this.root,key)) === null) {
        return null;
    }
    else {
        return searched.data;
    }
}

sourcesBST.prototype.remove = function(data)
{
    let key = new NodeSource(data);
    this.root = this.removeNode(this.root, data);
}

sourcesBST.prototype.insert = function(data) {
    let newNode = new NodeSource(data);
    if(this.root === null)
        this.root = newNode;
    else
        this.insertNode(this.root, newNode);
}

let mybst = new sourcesBST();
let obj;

obj = {
    zoom_level: 0,
    min_x: 1,
    min_y: 2
};

mybst.insert(obj);

obj = {
    zoom_level: 0,
    min_x: 0,
    min_y: 0
};

mybst.insert(obj);

obj = {
    zoom_level: 1,
    min_x: 10,
    min_y: 20
};

mybst.insert(obj);

obj = {
    zoom_level: 0,
    min_x: 0,
    min_y: 0
};

mybst.insert(obj);

obj = {
    zoom_level: 0,
    min_x: 20,
    min_y: 10
};

mybst.insert(obj);

obj = {
    zoom_length: 1,
    min_x: 3,
    min_y: 3
};

mybst.insert(obj);

mybst.inorder(mybst.getRootNode());

let bst = new BST();
bst.insert('hariom');
bst.insert('abcd');
bst.insert('hhhh');
bst.insert('aaaa');
bst.insert('dsfg');
bst.insert('lkhj');
bst.insert('hariom');
bst.insert('haaye re');
bst.inorder(bst.getRootNode());