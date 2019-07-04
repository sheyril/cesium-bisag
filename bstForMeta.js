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

// Node.prototype.isLess = function(node2) {
//     // console.log('in isLess');
//     if(this.data.interval_length < node2.data.interval_length)    {
//         return true;
//     }
//     else {
//         if(this.data.min_x < node2.data.min_x)    {
//             return true;
//         }
//         else if(this.data.min_x === node2.data.min_x) {
//             if(this.data.min_y < node2.data.min_y)
//                 return true;
//             else {
//                 return false;
//             }
//         }
//         else {
//             return false;
//         }
//     }
// }
//
// Node.prototype.isGreater = function(node2) {
//     if(this.data.interval_length > node2.data.interval_length)  {
//         return true;
//     }
//     else {
//         if(this.data.min_x > node2.data.min_x)    {
//             return true;
//         }
//         else if(this.data.min_x === node2.data.min_x) {
//             if(this.data.min_y > node2.data.min_y)
//                 return true;
//             else
//                 return false;
//         }
//         else {
//             return false;
//         }
//     }
// }

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

BST.prototype.search = function(node, data)
{
    let key = new Node(data);
    let searched = searchNode(this.root, key);
    if(searched === null) {
        return null;
    }
    else {
        return searched.data;
    }
}

BST.prototype.searchNode = function(node, key)  {
    if(node === null)
        return null;
    else if(key.isLess(node))   {
        return this.search(node.left, key);
    }
    else if(key.isGreater(node))    {
        return this.search(node.right, key);
    }
    else {
        return node;
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

//Permutes the array so that tree is not skewed
function shuffle(array) {
    let currentIndex = array.length, temporaryValue, randomIndex;
    while (0 !== currentIndex) {

    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

// let array = [
//   {
//     interval_length: 100,
//     min_x: 91.999861,
//     max_x: 92.2843054444444,
//     min_y: 21.9998612222222,
//     max_y: 22.1468056666667,
//     tiledname: '_my_contours_0'
//   },
//   {
//     interval_length: 100,
//     min_x: 91.999861,
//     max_x: 92.2843054444444,
//     min_y: 22.1468056666667,
//     max_y: 22.4312501111111,
//     tiledname: '_my_contours_1'
//   },
//   {
//     interval_length: 100,
//     min_x: 91.999861,
//     max_x: 92.2843054444444,
//     min_y: 22.4312501111111,
//     max_y: 22.7156945555556,
//     tiledname: '_my_contours_2'
//   },
//   {
//     interval_length: 100,
//     min_x: 91.999861,
//     max_x: 92.2843054444444,
//     min_y: 22.7156945555556,
//     max_y: 23.000139,
//     tiledname: '_my_contours_3'
//   },
//   {
//     interval_length: 100,
//     min_x: 92.2843054444444,
//     max_x: 92.5687498888889,
//     min_y: 21.9998612222222,
//     max_y: 22.1468056666667,
//     tiledname: '_my_contours_4'
//   },
//   {
//     interval_length: 100,
//     min_x: 92.2843054444444,
//     max_x: 92.5687498888889,
//     min_y: 22.1468056666667,
//     max_y: 22.4312501111111,
//     tiledname: '_my_contours_5'
//   },
//   {
//     interval_length: 100,
//     min_x: 92.2843054444444,
//     max_x: 92.5687498888889,
//     min_y: 22.4312501111111,
//     max_y: 22.7156945555556,
//     tiledname: '_my_contours_6'
//   },
//   {
//     interval_length: 100,
//     min_x: 92.2843054444444,
//     max_x: 92.5687498888889,
//     min_y: 22.7156945555556,
//     max_y: 23.000139,
//     tiledname: '_my_contours_7'
//   },
//   {
//     interval_length: 100,
//     min_x: 92.5687498888889,
//     max_x: 92.8531943333333,
//     min_y: 21.9998612222222,
//     max_y: 22.1468056666667,
//     tiledname: '_my_contours_8'
//   },
//   {
//     interval_length: 100,
//     min_x: 92.5687498888889,
//     max_x: 92.8531943333333,
//     min_y: 22.1468056666667,
//     max_y: 22.4312501111111,
//     tiledname: '_my_contours_9'
//   },
//   {
//     interval_length: 100,
//     min_x: 92.5687498888889,
//     max_x: 92.8531943333333,
//     min_y: 22.4312501111111,
//     max_y: 22.7156945555556,
//     tiledname: '_my_contours_10'
//   },
//   {
//     interval_length: 100,
//     min_x: 92.5687498888889,
//     max_x: 92.8531943333333,
//     min_y: 22.7156945555556,
//     max_y: 23.000139,
//     tiledname: '_my_contours_11'
//   },
//   {
//     interval_length: 100,
//     min_x: 92.8531943333333,
//     max_x: 93.0001387777778,
//     min_y: 21.9998612222222,
//     max_y: 22.1468056666667,
//     tiledname: '_my_contours_12'
//   },
//   {
//     interval_length: 100,
//     min_x: 92.8531943333333,
//     max_x: 93.0001387777778,
//     min_y: 22.1468056666667,
//     max_y: 22.4312501111111,
//     tiledname: '_my_contours_13'
//   },
//   {
//     interval_length: 100,
//     min_x: 92.8531943333333,
//     max_x: 93.0001387777778,
//     min_y: 22.4312501111111,
//     max_y: 22.7156945555556,
//     tiledname: '_my_contours_14'
//   },
//   {
//     interval_length: 100,
//     min_x: 92.8531943333333,
//     max_x: 93.0001387777778,
//     min_y: 22.7156945555556,
//     max_y: 23.000139,
//     tiledname: '_my_contours_15'
//   },
//   {
//     interval_length: 10,
//     min_x: 91.999861,
//     max_x: 92.2843054444444,
//     min_y: 21.9998612222222,
//     max_y: 22.1468056666667,
//     tiledname: '_my_contours_16'
//   },
//   {
//     interval_length: 10,
//     min_x: 91.999861,
//     max_x: 92.2843054444444,
//     min_y: 22.1468056666667,
//     max_y: 22.4312501111111,
//     tiledname: '_my_contours_17'
//   },
//   {
//     interval_length: 10,
//     min_x: 91.999861,
//     max_x: 92.2843054444444,
//     min_y: 22.4312501111111,
//     max_y: 22.7156945555556,
//     tiledname: '_my_contours_18'
//   },
//   {
//     interval_length: 10,
//     min_x: 91.999861,
//     max_x: 92.2843054444444,
//     min_y: 22.7156945555556,
//     max_y: 23.000139,
//     tiledname: '_my_contours_19'
//   },
//   {
//     interval_length: 10,
//     min_x: 92.2843054444444,
//     max_x: 92.5687498888889,
//     min_y: 21.9998612222222,
//     max_y: 22.1468056666667,
//     tiledname: '_my_contours_20'
//   },
//   {
//     interval_length: 10,
//     min_x: 92.2843054444444,
//     max_x: 92.5687498888889,
//     min_y: 22.1468056666667,
//     max_y: 22.4312501111111,
//     tiledname: '_my_contours_21'
//   },
//   {
//     interval_length: 10,
//     min_x: 92.2843054444444,
//     max_x: 92.5687498888889,
//     min_y: 22.4312501111111,
//     max_y: 22.7156945555556,
//     tiledname: '_my_contours_22'
//   },
//   {
//     interval_length: 10,
//     min_x: 92.2843054444444,
//     max_x: 92.5687498888889,
//     min_y: 22.7156945555556,
//     max_y: 23.000139,
//     tiledname: '_my_contours_23'
//   },
//   {
//     interval_length: 10,
//     min_x: 92.5687498888889,
//     max_x: 92.8531943333333,
//     min_y: 21.9998612222222,
//     max_y: 22.1468056666667,
//     tiledname: '_my_contours_24'
//   },
//   {
//     interval_length: 10,
//     min_x: 92.5687498888889,
//     max_x: 92.8531943333333,
//     min_y: 22.1468056666667,
//     max_y: 22.4312501111111,
//     tiledname: '_my_contours_25'
//   },
//   {
//     interval_length: 10,
//     min_x: 92.5687498888889,
//     max_x: 92.8531943333333,
//     min_y: 22.4312501111111,
//     max_y: 22.7156945555556,
//     tiledname: '_my_contours_26'
//   },
//   {
//     interval_length: 10,
//     min_x: 92.5687498888889,
//     max_x: 92.8531943333333,
//     min_y: 22.7156945555556,
//     max_y: 23.000139,
//     tiledname: '_my_contours_27'
//   },
//   {
//     interval_length: 10,
//     min_x: 92.8531943333333,
//     max_x: 93.0001387777778,
//     min_y: 21.9998612222222,
//     max_y: 22.1468056666667,
//     tiledname: '_my_contours_28'
//   },
//   {
//     interval_length: 10,
//     min_x: 92.8531943333333,
//     max_x: 93.0001387777778,
//     min_y: 22.1468056666667,
//     max_y: 22.4312501111111,
//     tiledname: '_my_contours_29'
//   },
//   {
//     interval_length: 10,
//     min_x: 92.8531943333333,
//     max_x: 93.0001387777778,
//     min_y: 22.4312501111111,
//     max_y: 22.7156945555556,
//     tiledname: '_my_contours_30'
//   },
//   {
//     interval_length: 10,
//     min_x: 92.8531943333333,
//     max_x: 93.0001387777778,
//     min_y: 22.7156945555556,
//     max_y: 23.000139,
//     tiledname: '_my_contours_31'
//   }
// ];
let array = ['hariom', 'hey', 'yo', 'abc', 'fdsj', 'eahs'];
shuffle(array);
// console.log(array);
let bst = new BST();
for(let i=0; i<array.length; i++)   {
    bst.insert(array[i]);
}

bst.inorder(bst.getRootNode());
