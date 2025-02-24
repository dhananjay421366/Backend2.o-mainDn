import { Cashfree } from "../../config/cashfree.config.js";
import db from '../../config/db.config.js';

const checkWebhook = async (req, res) => {
  //return res.status(200).send('Webhook received');
  console.log("req.rawBody", req.body);
  try {

    try {
      // Verify the signature
      Cashfree.PGVerifyWebhookSignature(
        req.headers["x-webhook-signature"],
        req.body.data,
        req.headers["x-webhook-timestamp"]
      );
    } catch ( webhookVerificationError ) {
      console.error("Webhook verification failed:", webhookVerificationError);
      return res.status(400).send("Webhook verification failed");
    }

    // check for payload data
    if (!req.body.data) {
      return res.status(400).send("Invalid payload data");
    }

    const { order, payment, customer_details, payment_gateway_details } = req.body.data;

    const { order_id } = order;

    // extracting the payement details 
    const { payment_status, payment_amount, payment_group, cf_payment_id } = payment;

    //use customer_id as booking_id
    const { customer_id } = customer_details;

    //transaction start
    await db.query('BEGIN');
    // update booking table status to booked
    const queryForTickets = `
      UPDATE bookings 
      SET status = $2 
      WHERE id = $1
      RETURNING event_id, ticket_type
    `;
    const valuesForTickets = [customer_id, payment_status]; //using customer_id as booking_id
    let resultForTickets;
  
    resultForTickets = await db.query(queryForTickets, valuesForTickets);
    if (resultForTickets.rows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }
    
    const { event_id, ticket_type } = resultForTickets.rows[0];

    if (payment_status === 'SUCCESS') {
      //Insert into tickets table
      const queryForTicketsInsert = `
        INSERT INTO tickets (booking_id, event_id, ticket_type, status) 
        VALUES ($1, $2, $3, $4)
      `;
      try {
        const valuesForTicketsInsert = [customer_id, event_id, ticket_type, payment_status];
        const resultForTicketsInsert = await db.query(queryForTicketsInsert, valuesForTicketsInsert);
      } catch (err) {
        await db.query('ROLLBACK');
        return res.status(400).json({ error: err });
      }
    }

    // insert payment details
    const query = `
      INSERT INTO payments (booking_id, amount, status, payment_method, transaction_id, order_id, event_id) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    const values = [customer_id, payment_amount, payment_status, payment_group, cf_payment_id, order_id, event_id];
    const result = await db.query(query, values);

    await db.query('COMMIT');
    res.status(200).send('Webhook received');

  } catch (err) {
    console.error('unexpected internal error occurred: ', err.message)
    await db.query('ROLLBACK');
    return res.status(500).json({ error: 'An internal server error occurred' });
  }

  
};


export {
  checkWebhook
}