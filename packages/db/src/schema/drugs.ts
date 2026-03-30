import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { drugClassificationEnum } from "./enums";

export const drugs = pgTable("drugs", {
  id: uuid("id").primaryKey().defaultRandom(),
  genericName: varchar("generic_name", { length: 255 }).notNull(),
  genericNameTh: varchar("generic_name_th", { length: 255 }),
  atcCode: varchar("atc_code", { length: 10 }),
  atcCategory: varchar("atc_category", { length: 255 }),
  classification: drugClassificationEnum("classification"),
  requiresPrescription: boolean("requires_prescription")
    .default(false)
    .notNull(),
  requiresPharmacist: boolean("requires_pharmacist").default(false).notNull(),
  dosageForms: text("dosage_forms").array().default([]),
  availableStrengths: jsonb("available_strengths").default([]),
  pregnancyCategory: varchar("pregnancy_category", { length: 5 }),
  breastfeedingSafe: boolean("breastfeeding_safe"),
  pediatricSafe: boolean("pediatric_safe"),
  geriatricSafe: boolean("geriatric_safe"),
  halfLife: varchar("half_life", { length: 50 }),
  proteinBinding: varchar("protein_binding", { length: 50 }),
  metabolism: text("metabolism"),
  excretion: text("excretion"),
  therapeuticRange: jsonb("therapeutic_range").default([]),
  commonSideEffects: text("common_side_effects").array(),
  seriousSideEffects: text("serious_side_effects").array(),
  contraindications: text("contraindications"),
  foodInteractions: jsonb("food_interactions").default([]),
  storageInfo: text("storage_info"),
  synonyms: text("synonyms").array().default([]),
  tags: text("tags").array().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const drugInteractions = pgTable("drug_interactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  drugAId: uuid("drug_a_id")
    .notNull()
    .references(() => drugs.id),
  drugBId: uuid("drug_b_id")
    .notNull()
    .references(() => drugs.id),
  severity: varchar("severity", { length: 20 }),
  mechanism: text("mechanism"),
  clinicalEffect: text("clinical_effect"),
  management: text("management"),
  evidenceLevel: varchar("evidence_level", { length: 20 }),
  referenceSources: jsonb("references").default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const drugDiseaseContraindications = pgTable(
  "drug_disease_contraindications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    drugId: uuid("drug_id")
      .notNull()
      .references(() => drugs.id),
    diseaseName: varchar("disease_name", { length: 255 }).notNull(),
    icd10Pattern: varchar("icd10_pattern", { length: 50 }),
    severity: varchar("severity", { length: 20 }),
    reason: text("reason"),
    alternative: text("alternative"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const drugAllergyGroups = pgTable("drug_allergy_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupName: varchar("group_name", { length: 100 }).unique().notNull(),
  description: text("description"),
  genericNames: text("generic_names").array().default([]),
  detectionHint: text("detection_hint"),
});
