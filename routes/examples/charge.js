const express = require("express"),
  router = express.Router(),
  url = require("url"),
  fetch = require("node-fetch"),
  Prism = require("prismjs"),
  products = require("../../stubs/products.json"),
  checkResponse = require("../../lib/utils").checkResponse,
  QVO_API_URL = 'https://playground.qvo.cl'; //Change it to https://api.qvo.cl on production

// GET /examples/charge
router.get('/', (req, res, next) => {
  res.render("examples/charge/index", {
    title: "Cobrar a tarjeta",
    product: products[0]
  });
});

// POST /examples/charge/pay
router.post("/pay", (req, res, next) => {
  let productID = req.body.productID;
  let product = products.find((product) => { return product.id == productID });

  let returnURL = `${req.protocol}://${req.header("host")}/examples/charge/return`;

  fetch(`${QVO_API_URL}/webpay_plus/charge`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.QVO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: product.price,
      return_url: returnURL,
      description: `Orden Cód. ${generateOrder()} - ${product.name}`
    })
  })
  .then(response => checkResponse(response))
  .then(response => {
    console.info("QVO API Response:", response);

    res.redirect(response.redirect_url);
  })
  .catch(response => {
    console.error('Error:', response);

    res.render("examples/charge/index", {
      title: "Cobrar a tarjeta",
      product: products[0],
      error: response.error
    });
  });
});

// GET /examples/charge/return
router.get('/return', (req, res, next) => {
  let transactionID = req.query.transaction_id;

  fetch(`${QVO_API_URL}/transactions/${transactionID}`, {
    headers: {
      Authorization: `Bearer ${process.env.QVO_API_KEY}`,
      'Content-Type': 'application/json',
    }
  })
  .then(response => checkResponse(response))
  .then(transaction => {
    console.info("QVO API Response:", transaction);

    if(transaction.status == 'successful') {
      res.render("examples/charge/success", {
        title: "Éxito - Cobrar a tarjeta",
        transaction: transaction
      });
    } else {
      res.render("examples/charge/failure", {
        title: "Fracaso - Cobrar a tarjeta",
        transaction: transaction
      });
    }
  })
  .catch(response => {
    console.error(response);
  });
});

function generateOrder() {
  return Math.random().toString(36).substr(2, 5);
}

module.exports = router;
