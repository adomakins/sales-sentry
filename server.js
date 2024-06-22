const cors = require("cors"); // Allows for API requests from a browser
const path = require("path"); // Allows for path.join() to serve static pages
const fs = require("fs"); // Allows for using dynamic values in static pages
const axios = require("axios"); // Allows for making simpler API requests
const { URLSearchParams } = require("url"); // Allows for simpler URL parameters

const express = require("express");
const app = express();

const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(cors());

// STATIC PAGE SERVERS (penis)

// Serve the static files from the public directory
app.use(express.static(path.join(__dirname, "public")));

// Serve the index page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Serve the install-complete page
app.get("/install-complete", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "install-complete.html"));
});

// API ENDPOINTS

// Endpoint to receive the installation code
app.post("/install-complete", async (req, res) => {
    // Extract and log code
    const auth_code = req.body.code;
    console.log("Received code:", auth_code);

    // Send code to Airtable
    airtableWebhook('install-complete', auth_code);
});

// Endpoint to receive the event webhooks
app.post("/event-receiver", (req, res) => {
    //console.log("/event-receiver data:", req.body);

    console.log("Event received:", req.body.type, "rawData:", JSON.stringify(req.body));
    const eventType = req.body.type;
    const data = { ...req.body, rawData: JSON.stringify(req.body) };

    switch (eventType) {
        case 'OutboundMessage':
        case 'InboundMessage':
            const messageType = req.body.messageType;
            if(messageType == "CALL" || messageType == "SMS") {
                airtableWebhook('message-event', data);
            }
            break;
        case 'ContactCreate':
            airtableWebhook('contact-create', data);
            break;
        case 'OpportunityStatusUpdate':
            if(req.body.status == "won") {
                airtableWebhook('deal-closed', data)
            }
            break;
        default:
            console.log("Unhandled event type:", eventType);
    }
});

// NETWORKING METHODS

// Function to send a webhook to Airtable
async function airtableWebhook(address, data) {
    
    let url;
    switch (address) {
        case 'install-complete':
            url = 'https://hooks.airtable.com/workflows/v1/genericWebhook/appWB2G8Xcilr50kH/wflPCVA0TxJGxkTlv/wtrh5wYKCRmZ9PW9S';
            break;
        case 'message-event':
            url = 'https://hooks.airtable.com/workflows/v1/genericWebhook/appWB2G8Xcilr50kH/wflSOzIz1GoCF0pLx/wtrUyr7AlaUbGInOy';
            break;
        case 'contact-create':
            url = 'https://hooks.airtable.com/workflows/v1/genericWebhook/appWB2G8Xcilr50kH/wflNk3bN2ohtciL5a/wtrU4nAXFCGndq5Uo';
            break;
        case 'deal-closed':
            url = 'https://hooks.airtable.com/workflows/v1/genericWebhook/appWB2G8Xcilr50kH/wflgHTzhaeLRsYVFn/wtrWyLqUnV5kminau';
            break;
    }
    
    try {
        await axios.post(url,
            { data },
            { headers: { "Content-Type": "application/json", }, }, );
        console.log("Event sent to Airtable:", address);
    } catch (webhookError) {
        console.error( "Error sending data to Airtable webhook:",
            webhookError.response ? webhookError.response.data : webhookError.message,
        );
    }
}

app.listen(PORT, () => console.log(`Node.js server running on port ${PORT}`));
