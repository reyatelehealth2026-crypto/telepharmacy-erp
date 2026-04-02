SELECT unnest(enum_range(NULL::drug_classification))::text AS value;
