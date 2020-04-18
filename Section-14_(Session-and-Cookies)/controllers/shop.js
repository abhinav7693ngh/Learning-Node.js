const Product = require('../models/product');
const Order = require('../models/order');

exports.getProducts = (req, res, next) => {
    Product.find().then(products => {
        res.render('shop/product-list.ejs', {
            prod: products,
            pageTitle: 'All Products',
            path: '/products',
            isAuthenticated: req.isLoggedIn
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
                path: `/products`,
                isAuthenticated: req.isLoggedIn
            });
        })
        .catch(err => {
            console.log(err);
        });  
};

exports.getIndex = (req, res, next) => {
    Product.find().then(products => {
        res.render('shop/index.ejs', {
            prod: products,
            pageTitle: 'Shop',
            path: '/',
            isAuthenticated: req.isLoggedIn
        });
    }).catch(err => {
        console.log(err);
    });
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
                products: products,
                isAuthenticated: req.isLoggedIn
            });
        })
        .catch(err => {
            console.log(err);
        })
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
        })
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
                orders: orders,
                isAuthenticated: req.isLoggedIn
            });
        })
        .catch(err =>{
            console.log(err);
        })
    
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
                    name: req.user.name,
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
        
}
