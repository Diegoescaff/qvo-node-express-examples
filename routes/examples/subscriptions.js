const express = require("express"),
  router = express.Router(),
  url = require("url"),
  fetch = require("node-fetch-json"),
  Prism = require("prismjs"),
  plans = require("../../stubs/plans.json");
  QVO_API_URL = "https://playground.qvo.cl"; //Change it to https://api.qvo.cl on production

// GET /examples/subscriptions
router.get("/", (req, res, next) => {
  res.render("examples/subscriptions/index", {
    title: "Planes y suscripciones",
    plans: plans
  });
});

// POST /examples/subscriptions/init_card_inscription
router.post("/init_card_inscription", (req, res, next) => {
  let customerBody = {
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone
  };

  // First create customer
  fetch(`${QVO_API_URL}/customers`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.QVO_API_KEY}`
    },
    body: customerBody
  })
  .then(customer => {
    console.info("QVO API Response:", customer);

    return customer.id;
  })
  .then(customerID => {
    let baseURL = `${req.protocol}://${req.header(
      "host"
    )}/examples/subscriptions`;
    let returnURL = `${baseURL}/plan/${req.body.plan_id}/customer/${customerID}/return`;

    // Create card inscription
    return fetch(`${QVO_API_URL}/customers/${customerID}/cards/inscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.QVO_API_KEY}`
      },
      body: {
        return_url: returnURL
      }
    })
    .then(cardInscription => {
      console.info("QVO API Response:", cardInscription);

      return cardInscription.redirect_url;
    });
  })
  .then(redirectURL => {
    // Redirect user to secure card inscription form
    res.redirect(redirectURL);
  })
  .catch(response => {
    console.error(response);

    // TODO: Render error
  });
});

// GET /examples/subscriptions/plan/:planID/customer/:customerID/return
router.get("/plan/:planID/customer/:customerID/return", (req, res, next) => {
  let inscriptionUID = req.query.uid;
  let plan = plans.find((plan) => { return plan.id == req.params.planID });

  // Check inscription status
  fetch(`${QVO_API_URL}/customers/${req.params.customerID}/cards/inscriptions/${inscriptionUID}`, {
    headers: {
      Authorization: `Bearer ${process.env.QVO_API_KEY}`
    }
  })
  .then(inscription => checkInscription(inscription))
  .then(card => {
    if(card) {
      // Subscribe customer to plan
      return fetch(`${QVO_API_URL}/subscriptions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.QVO_API_KEY}`
        },
        body: {
          plan_id: plan.qvoPlanID,
          customer_id: req.params.customerID
        }
      })
      .then(subscription => {
        console.info("QVO API Response:", subscription);

        return [subscription, card];
      })
    } else {
      res.render("examples/subscriptions/failure", {
        title: "Fracaso - Planes y suscripciones"
      });
    }
  })
  .then(subscriptionDisplayParams => {
    res.render("examples/subscriptions/success", {
      title: "Éxito - Planes y suscripciones",
      subscription: subscriptionDisplayParams[0],
      card: subscriptionDisplayParams[1]
    });
  })
  .catch(response => {
    console.error(response);

    res.render("examples/subscriptions/failure", {
      title: 'Fracaso - Planes y suscripciones'
    });
  });
});

function checkInscription(inscription) {
  if(inscription.status == 'succeeded'){
    return inscription.card;
  } else {
    return null;
  }
}

module.exports = router;
