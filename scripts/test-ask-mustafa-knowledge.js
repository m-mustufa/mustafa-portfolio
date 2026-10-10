const assert = require("node:assert/strict");
const {
  buildKnowledgeContext,
  getAvailabilityContext,
  selectKnowledge
} = require("../netlify/functions/ask-mustafa-knowledge");

const angularTopics = selectKnowledge("Tell me about your Angular and RxJS experience", []);
assert.equal(angularTopics[0].id, "angular");
const angularContext = buildKnowledgeContext("What did you build with Angular at AutoLeap?", [], {});
assert.match(angularContext, /Workboard 2\.0/);
assert.match(angularContext, /version 8 through version 19/);
assert.match(angularContext, /10\+ product modules/);
assert.match(angularContext, /Do not attribute unrelated AutoLeap APIs/);

const projectContext = buildKnowledgeContext("Which SaaS products have you built?", [], {});
assert.match(projectContext, /CultureAI/);
assert.match(projectContext, /AutoLeap/);
assert.match(projectContext, /solo builder/i);
assert.match(projectContext, /team product/i);
assert.match(projectContext, /2,000\+ Shopify stores/);

const backgroundContext = buildKnowledgeContext("What is your education and IELTS score?", [], {});
assert.match(backgroundContext, /Aptech Computer Education/);
assert.match(backgroundContext, /IELTS overall band score is 7\.0/);

const apexContext = buildKnowledgeContext("What did you build for Apex Logistics?", [], {});
assert.match(apexContext, /driver bidding/);
assert.match(apexContext, /Xero OAuth2/);

const defaultAvailability = getAvailabilityContext({});
assert.match(defaultAvailability, /Status: confirm/);
assert.match(defaultAvailability, /never say Mustafa is definitely free/i);

const openAvailability = getAvailabilityContext({
  MUSTAFA_AVAILABILITY_STATUS: "open",
  MUSTAFA_AVAILABILITY_NOTE: "Taking one focused project in November."
});
assert.match(openAvailability, /accepting suitable new enquiries/i);
assert.match(openAvailability, /Taking one focused project in November\./);

const unavailableAvailability = getAvailabilityContext({
  MUSTAFA_AVAILABILITY_STATUS: "unavailable"
});
assert.match(unavailableAvailability, /not currently accepting/i);

console.log("Ask Mustafa knowledge selection and availability tests passed.");
