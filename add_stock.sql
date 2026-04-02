SELECT p.id, p.name_th, p.sku
FROM products p
LEFT JOIN inventory_lots il ON il.product_id = p.id
WHERE p.deleted_at IS NULL AND p.status = 'active'
GROUP BY p.id, p.name_th, p.sku
HAVING COALESCE(SUM(CAST(il.quantity_available AS numeric)), 0) = 0
LIMIT 20;
