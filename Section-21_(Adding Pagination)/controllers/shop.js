const Product = require('../models/product');
const Order = require('../models/order');
const fs = require('fs');
const path = require('path');

const ITEMS_PER_PAGE = 1;

exports.getProducts = (req, res, next) => {
    Product.find().then(products => {
        res.render('shop/product-list.ejs', {
            prod: products,
            pageTitle: 'All Products',
            path: '/products'
        });
    }).catch(err => {
        console.log(err);
    });
};

exports.getProduct = (req,res,next) => {
    const prodId = req.params.productId;
    Product.findById(prodId)
        .then((product) => {
            res.render('shop/product-detail.ejs', {
                product: product,
                pageTitle: product.title,
                path: `/products`
            });
        })
        .catch(err => {
            console.log(err);
        });  
};

exports.getIndex = (req, res, next) => {
    const page = +req.query.page || 1;
    let totalItems;

    Product.countDocuments()
        .then(numProducts => {
            totalItems = numProducts;
            return Product.find()
                .skip((page - 1) * ITEMS_PER_PAGE)
                .limit(ITEMS_PER_PAGE);
        })
        .then(products => {
            res.render('shop/index.ejs', {
                prod: products,
                pageTitle: 'Shop',
                path: '/',
                totalProducts : totalItems,
                currentPage : page,
                hasNextPage : ITEMS_PER_PAGE * page < totalItems,
                hasPreviousPage : page > 1,
                nextPage : page + 1,
                previousPage : page - 1,
                lastPage : Math.ceil((totalItems)/ITEMS_PER_PAGE)
            });
        })
        .catch(err => {
            console.log(err);
        })


    // Product.find().skip((page - 1) * ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).then(products => {
    //     res.render('shop/index.ejs', {
    //         prod: products,
    //         pageTitle: 'Shop',
    //         path: '/'
    //     });
    // }).catch(err => {
    //     console.log(err);
    // });


};

exports.getCart = (req, res, next) => { 
    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then(user => {
            products = user.cart.items;
            res.render('shop/cart.ejs', {
                pageTitle: 'Your Cart',
                path: '/cart',
                products: products
            });
        })
        .catch(err => {
            console.log(err);
        });
};

exports.postCart = (req,res,next) => {
    const prodID = req.body.productId;
    Product.findById(prodID)
        .then(product => {
            return req.user.addToCart(product);
        })
        .then(result => {
            res.redirect('./cart');
        })
        .catch(err => {
            console.log(err);
        });
};

exports.postCartDeleteProduct = (req,res,next) =>{
    const prodId = req.body.productId;
    req.user.removeFromCart(prodId)
        .then(result => {
            res.redirect('/cart');
        })
        .catch(err => console.log(err));
};



exports.getOrders = (req, res, next) => {
    Order.find({'user.userId' : req.user._id})
        .then(orders => {
            res.render('shop/orders.ejs', {
                pageTitle: 'Orders',
                path: '/orders',
                orders: orders
            });
        })
        .catch(err =>{
            console.log(err);
        });
    
};

exports.postOrder = (req,res,next) => {
    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then(user => {
            const products = user.cart.items.map(i => {
                return {quantity : i.quantity,product : {...i.productId._doc}};
            });
            const order = new Order({
                user: {
                    email : req.user.email,
                    userId: req.user
                },
                products: products
            });
            return order.save();
        })
        .then(result => {
            return req.user.clearCart();
        })
        .then(final => {
            res.redirect('/cart');
        })
        .catch(err => {
            console.log(err);
        });
        
};


exports.getInvoice = (req, res, next) => {
    const orderId = req.params.orderId;
    Order.findById(orderId).then(order => {
        if(!order){
            console.log('No order found');
            return;
        }
        if(order.user.userId.toString() !== req.user._id.toString()){
            console.log('UnAuthorized');
            return;
        }
    }).catch(err => {
        console.log(err);
    })
    const invoiceName = 'invoice-' + orderId + '.pdf';
    const invoicePath = path.join('invoices', invoiceName);
    // fs.readFile(invoicePath, (err, data) => {
    //     if(err){
    //         console.log(err);
    //         return;
    //     }
    //     res.setHeader('Content-Type','application/pdf');
    //     res.setHeader('Content-Disposition','attachment; filename="' + invoiceName + '"');
    //     res.send(data);
    // })

    const file = fs.createReadStream(invoicePath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition','attachment; filename="' + invoiceName + '"');
    file.pipe(res);
};
