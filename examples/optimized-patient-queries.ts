// Example: Optimized Patient Queries Following Telepharmacy Best Practices
// This demonstrates the power's database optimization guidelines

import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '@telepharmacy/db';
import { patients, prescriptions, orders } from '@telepharmacy/db/schema';

export class OptimizedPatientService {
  
  // ✅ GOOD: Selective queries with proper joins (Best Practice #1)
  async getPatientDashboard(patientId: string) {
    return await db
      .select({
        // Only select needed fields
        patient: {
          id: patients.id,
          name: patients.name,
          phone: patients.phone,
          loyaltyPoints: patients.loyaltyPoints,
        },
        // Aggregate data efficiently
        stats: {
          totalOrders: sql<number>`count(distinct ${orders.id})`,
          pendingPrescriptions: sql<number>`count(distinct case when ${prescriptions.status} = 'pending' then ${prescriptions.id} end)`,
        }
      })
      .from(patients)
      .leftJoin(orders, eq(orders.patientId, patients.id))
      .leftJoin(prescriptions, eq(prescriptions.patientId, patients.id))
      .where(eq(patients.id, patientId))
      .groupBy(patients.id);
  }

  // ✅ GOOD: Proper indexing strategy (Best Practice #2)
  async getRecentOrders(patientId: string, limit = 10) {
    return await db
      .select({
        id: orders.id,
        orderNo: orders.orderNo,
        status: orders.status,
        total: orders.total,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.patientId, patientId))
      .orderBy(desc(orders.createdAt)) // Index on (patient_id, created_at)
      .limit(limit);
  }

  // ✅ GOOD: Batch operations for performance (Best Practice #3)
  async updateMultiplePatientLoyalty(updates: Array<{id: string, points: number}>) {
    const queries = updates.map(update => 
      db.update(patients)
        .set({ 
          loyaltyPoints: sql`${patients.loyaltyPoints} + ${update.points}`,
          updatedAt: new Date()
        })
        .where(eq(patients.id, update.id))
    );
    
    // Execute in transaction for consistency
    return await db.transaction(async (tx) => {
      return await Promise.all(queries.map(query => tx.execute(query)));
    });
  }

  // ✅ GOOD: Proper error handling with logging (Best Practice #4)
  async findPatientByPhone(phone: string) {
    try {
      const result = await db
        .select()
        .from(patients)
        .where(eq(patients.phone, phone))
        .limit(1);
      
      return result[0] || null;
    } catch (error) {
      // Structured logging as per best practices
      console.error('Failed to find patient by phone', {
        phone: phone.replace(/\d{4}$/, '****'), // Mask for privacy
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }
}

// Database Index Recommendations (Best Practice #5)
/*
CREATE INDEX CONCURRENTLY idx_orders_patient_created 
ON orders (patient_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_prescriptions_patient_status 
ON prescriptions (patient_id, status);

CREATE INDEX CONCURRENTLY idx_patients_phone 
ON patients (phone);
*/