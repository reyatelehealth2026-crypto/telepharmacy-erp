SELECT unnest(enum_range(NULL::intervention_type))::text AS value;
