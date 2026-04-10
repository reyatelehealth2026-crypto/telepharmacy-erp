import { relations } from "drizzle-orm";
import { staff } from "./staff";
import {
  patients,
  patientAllergies,
  patientChronicDiseases,
  patientMedications,
} from "./patients";
import {
  drugs,
  drugInteractions,
  drugDiseaseContraindications,
} from "./drugs";
import { categories, products } from "./products";
import { inventoryLots, stockMovements } from "./inventory";
import {
  prescriptions,
  prescriptionItems,
  safetyChecks,
  pharmacistInterventions,
  counselingSessions,
} from "./prescriptions";
import { orders, orderItems, payments, deliveries } from "./orders";
import {
  loyaltyAccounts,
  pointsTransactions,
  promotions,
} from "./loyalty";
import {
  chatSessions,
  chatMessages,
  lineContactJourneys,
  lineWebhookEvents,
  patientTags,
  patientTagAssignments,
} from "./chat";
import { notifications } from "./notifications";
import { content } from "./content";
import { complaints } from "./complaints";
import { auditLog, medicationReminders } from "./system";

export const staffRelations = relations(staff, ({ many }) => ({
  patientAllergiesRecorded: many(patientAllergies),
  patientChronicDiseasesRecorded: many(patientChronicDiseases),
  patientMedicationsRecorded: many(patientMedications),
  verifiedPrescriptions: many(prescriptions),
  interventions: many(pharmacistInterventions),
  counselingSessions: many(counselingSessions),
  assignedChatSessions: many(chatSessions),
  chatMessages: many(chatMessages),
  notifications: many(notifications),
  contentAuthored: many(content),
  complaintsResolved: many(complaints),
  auditLogs: many(auditLog),
  promotionsCreated: many(promotions),
  productsCreated: many(products, { relationName: "productCreatedBy" }),
  productsUpdated: many(products, { relationName: "productUpdatedBy" }),
  paymentsVerified: many(payments),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  allergies: many(patientAllergies),
  chronicDiseases: many(patientChronicDiseases),
  medications: many(patientMedications),
  prescriptions: many(prescriptions),
  orders: many(orders),
  loyaltyAccount: one(loyaltyAccounts),
  chatSessions: many(chatSessions),
  lineContactJourneys: many(lineContactJourneys),
  lineWebhookEvents: many(lineWebhookEvents),
  tagAssignments: many(patientTagAssignments),
  notifications: many(notifications),
  complaints: many(complaints),
  medicationReminders: many(medicationReminders),
}));

export const patientAllergiesRelations = relations(
  patientAllergies,
  ({ one }) => ({
    patient: one(patients, {
      fields: [patientAllergies.patientId],
      references: [patients.id],
    }),
    recorder: one(staff, {
      fields: [patientAllergies.recordedBy],
      references: [staff.id],
    }),
  }),
);

export const patientChronicDiseasesRelations = relations(
  patientChronicDiseases,
  ({ one }) => ({
    patient: one(patients, {
      fields: [patientChronicDiseases.patientId],
      references: [patients.id],
    }),
    recorder: one(staff, {
      fields: [patientChronicDiseases.recordedBy],
      references: [staff.id],
    }),
  }),
);

export const patientMedicationsRelations = relations(
  patientMedications,
  ({ one, many }) => ({
    patient: one(patients, {
      fields: [patientMedications.patientId],
      references: [patients.id],
    }),
    recorder: one(staff, {
      fields: [patientMedications.recordedBy],
      references: [staff.id],
    }),
    reminders: many(medicationReminders),
  }),
);

export const drugsRelations = relations(drugs, ({ many }) => ({
  interactionsAsA: many(drugInteractions, { relationName: "drugA" }),
  interactionsAsB: many(drugInteractions, { relationName: "drugB" }),
  diseaseContraindications: many(drugDiseaseContraindications),
  products: many(products),
  safetyChecks: many(safetyChecks),
}));

export const drugInteractionsRelations = relations(
  drugInteractions,
  ({ one }) => ({
    drugA: one(drugs, {
      fields: [drugInteractions.drugAId],
      references: [drugs.id],
      relationName: "drugA",
    }),
    drugB: one(drugs, {
      fields: [drugInteractions.drugBId],
      references: [drugs.id],
      relationName: "drugB",
    }),
  }),
);

export const drugDiseaseContraindicationsRelations = relations(
  drugDiseaseContraindications,
  ({ one }) => ({
    drug: one(drugs, {
      fields: [drugDiseaseContraindications.drugId],
      references: [drugs.id],
    }),
  }),
);

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "categoryParent",
  }),
  children: many(categories, { relationName: "categoryParent" }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  drug: one(drugs, {
    fields: [products.drugId],
    references: [drugs.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  createdByStaff: one(staff, {
    fields: [products.createdBy],
    references: [staff.id],
    relationName: "productCreatedBy",
  }),
  updatedByStaff: one(staff, {
    fields: [products.updatedBy],
    references: [staff.id],
    relationName: "productUpdatedBy",
  }),
  inventoryLots: many(inventoryLots),
  stockMovements: many(stockMovements),
  orderItems: many(orderItems),
  prescriptionItems: many(prescriptionItems),
}));

export const inventoryLotsRelations = relations(
  inventoryLots,
  ({ one, many }) => ({
    product: one(products, {
      fields: [inventoryLots.productId],
      references: [products.id],
    }),
    stockMovements: many(stockMovements),
    orderItems: many(orderItems),
    prescriptionItems: many(prescriptionItems),
  }),
);

export const stockMovementsRelations = relations(
  stockMovements,
  ({ one }) => ({
    lot: one(inventoryLots, {
      fields: [stockMovements.lotId],
      references: [inventoryLots.id],
    }),
    product: one(products, {
      fields: [stockMovements.productId],
      references: [products.id],
    }),
    performer: one(staff, {
      fields: [stockMovements.performedBy],
      references: [staff.id],
    }),
  }),
);

export const prescriptionsRelations = relations(
  prescriptions,
  ({ one, many }) => ({
    patient: one(patients, {
      fields: [prescriptions.patientId],
      references: [patients.id],
    }),
    verifier: one(staff, {
      fields: [prescriptions.verifiedBy],
      references: [staff.id],
    }),
    items: many(prescriptionItems),
    interventions: many(pharmacistInterventions),
    counselingSessions: many(counselingSessions),
    orders: many(orders),
    chatSessions: many(chatSessions),
  }),
);

export const prescriptionItemsRelations = relations(
  prescriptionItems,
  ({ one, many }) => ({
    prescription: one(prescriptions, {
      fields: [prescriptionItems.prescriptionId],
      references: [prescriptions.id],
    }),
    matchedProduct: one(products, {
      fields: [prescriptionItems.matchedProductId],
      references: [products.id],
    }),
    dispensedLot: one(inventoryLots, {
      fields: [prescriptionItems.dispensedLotId],
      references: [inventoryLots.id],
    }),
    safetyChecks: many(safetyChecks),
  }),
);

export const safetyChecksRelations = relations(safetyChecks, ({ one }) => ({
  prescriptionItem: one(prescriptionItems, {
    fields: [safetyChecks.prescriptionItemId],
    references: [prescriptionItems.id],
  }),
  referenceDrug: one(drugs, {
    fields: [safetyChecks.referenceDrugId],
    references: [drugs.id],
  }),
}));

export const pharmacistInterventionsRelations = relations(
  pharmacistInterventions,
  ({ one }) => ({
    prescription: one(prescriptions, {
      fields: [pharmacistInterventions.prescriptionId],
      references: [prescriptions.id],
    }),
    pharmacist: one(staff, {
      fields: [pharmacistInterventions.pharmacistId],
      references: [staff.id],
    }),
  }),
);

export const counselingSessionsRelations = relations(
  counselingSessions,
  ({ one }) => ({
    prescription: one(prescriptions, {
      fields: [counselingSessions.prescriptionId],
      references: [prescriptions.id],
    }),
    pharmacist: one(staff, {
      fields: [counselingSessions.pharmacistId],
      references: [staff.id],
    }),
  }),
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  patient: one(patients, {
    fields: [orders.patientId],
    references: [patients.id],
  }),
  prescription: one(prescriptions, {
    fields: [orders.prescriptionId],
    references: [prescriptions.id],
  }),
  items: many(orderItems),
  payments: many(payments),
  deliveries: many(deliveries),
  chatSessions: many(chatSessions),
  complaints: many(complaints),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  lot: one(inventoryLots, {
    fields: [orderItems.lotId],
    references: [inventoryLots.id],
  }),
  refillFromItem: one(orderItems, {
    fields: [orderItems.refillFromItemId],
    references: [orderItems.id],
    relationName: "refillSource",
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
  slipVerifier: one(staff, {
    fields: [payments.slipVerifiedBy],
    references: [staff.id],
  }),
}));

export const deliveriesRelations = relations(deliveries, ({ one }) => ({
  order: one(orders, {
    fields: [deliveries.orderId],
    references: [orders.id],
  }),
}));

export const loyaltyAccountsRelations = relations(
  loyaltyAccounts,
  ({ one, many }) => ({
    patient: one(patients, {
      fields: [loyaltyAccounts.patientId],
      references: [patients.id],
    }),
    transactions: many(pointsTransactions),
  }),
);

export const pointsTransactionsRelations = relations(
  pointsTransactions,
  ({ one }) => ({
    loyaltyAccount: one(loyaltyAccounts, {
      fields: [pointsTransactions.loyaltyAccountId],
      references: [loyaltyAccounts.id],
    }),
  }),
);

export const promotionsRelations = relations(promotions, ({ one }) => ({
  creator: one(staff, {
    fields: [promotions.createdBy],
    references: [staff.id],
  }),
}));

export const chatSessionsRelations = relations(
  chatSessions,
  ({ one, many }) => ({
    patient: one(patients, {
      fields: [chatSessions.patientId],
      references: [patients.id],
    }),
    order: one(orders, {
      fields: [chatSessions.orderId],
      references: [orders.id],
    }),
    prescription: one(prescriptions, {
      fields: [chatSessions.prescriptionId],
      references: [prescriptions.id],
    }),
    assignee: one(staff, {
      fields: [chatSessions.assignedTo],
      references: [staff.id],
    }),
    messages: many(chatMessages),
    webhookEvents: many(lineWebhookEvents),
    complaints: many(complaints),
  }),
);

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
  staffSender: one(staff, {
    fields: [chatMessages.sentByStaff],
    references: [staff.id],
  }),
}));

export const lineContactJourneysRelations = relations(
  lineContactJourneys,
  ({ one }) => ({
    patient: one(patients, {
      fields: [lineContactJourneys.patientId],
      references: [patients.id],
    }),
  }),
);

export const lineWebhookEventsRelations = relations(
  lineWebhookEvents,
  ({ one }) => ({
    patient: one(patients, {
      fields: [lineWebhookEvents.patientId],
      references: [patients.id],
    }),
    session: one(chatSessions, {
      fields: [lineWebhookEvents.sessionId],
      references: [chatSessions.id],
    }),
  }),
);

export const patientTagsRelations = relations(patientTags, ({ many }) => ({
  assignments: many(patientTagAssignments),
}));

export const patientTagAssignmentsRelations = relations(
  patientTagAssignments,
  ({ one }) => ({
    patient: one(patients, {
      fields: [patientTagAssignments.patientId],
      references: [patients.id],
    }),
    tag: one(patientTags, {
      fields: [patientTagAssignments.tagId],
      references: [patientTags.id],
    }),
    assignedBy: one(staff, {
      fields: [patientTagAssignments.assignedByStaffId],
      references: [staff.id],
    }),
  }),
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  patient: one(patients, {
    fields: [notifications.patientId],
    references: [patients.id],
  }),
  staffMember: one(staff, {
    fields: [notifications.staffId],
    references: [staff.id],
  }),
}));

export const contentRelations = relations(content, ({ one }) => ({
  author: one(staff, {
    fields: [content.authorId],
    references: [staff.id],
  }),
}));

export const complaintsRelations = relations(complaints, ({ one }) => ({
  patient: one(patients, {
    fields: [complaints.patientId],
    references: [patients.id],
  }),
  order: one(orders, {
    fields: [complaints.orderId],
    references: [orders.id],
  }),
  chatSession: one(chatSessions, {
    fields: [complaints.chatSessionId],
    references: [chatSessions.id],
  }),
  resolver: one(staff, {
    fields: [complaints.resolvedBy],
    references: [staff.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  changer: one(staff, {
    fields: [auditLog.changedBy],
    references: [staff.id],
  }),
}));

export const medicationRemindersRelations = relations(
  medicationReminders,
  ({ one }) => ({
    patient: one(patients, {
      fields: [medicationReminders.patientId],
      references: [patients.id],
    }),
    patientMedication: one(patientMedications, {
      fields: [medicationReminders.patientMedicationId],
      references: [patientMedications.id],
    }),
  }),
);
