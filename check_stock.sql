SELECT 
  p.name_th,
  p.sell_price,
  COUNT(il.id) AS lot_count,
  COALESCE(SUM(CAST(il.quantity_available AS numeric)), 0) AS total_available
FROM products p
LEFT JOIN inventory_lots il ON il.product_id = p.id AND il.status = 'available'
WHERE p.id = '2005d90a-3434-4133-9805-6f1498c6b714'
GROUP BY p.id, p.name_th, p.sell_price;

SELECT id, lot_no, quantity_available, quantity_reserved, status, expiry_date
FROM inventory_lots
WHERE product_id = '2005d90a-3434-4133-9805-6f1498c6b714'
ORDER BY expiry_date;
