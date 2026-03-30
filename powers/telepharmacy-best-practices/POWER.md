---
name: "telepharmacy-best-practices"
displayName: "Telepharmacy Best Practices"
description: "Best practices and guidelines for developing the LINE Telepharmacy ERP system with NestJS, Next.js, and PostgreSQL."
keywords: ["telepharmacy", "nestjs", "nextjs", "postgresql", "best-practices", "line"]
author: "Telepharmacy Team"
---

# Telepharmacy Best Practices

## Overview

This power provides comprehensive best practices and guidelines for developing the LINE Telepharmacy ERP system. It covers backend development with NestJS, frontend development with Next.js, database design with PostgreSQL, and LINE platform integration.

These practices ensure code quality, maintainability, security, and compliance with Thai pharmacy regulations.

## Core Principles

### 1. Security First
- Always validate and sanitize user inputs
- Implement proper authentication and authorization
- Follow PDPA compliance requirements for Thai personal data
- Use environment variables for sensitive configuration

### 2. Type Safety
- Use TypeScript throughout the stack
- Implement Zod validators for runtime type checking
- Define clear interfaces for API contracts
- Leverage Drizzle ORM for type-safe database operations

### 3. Modular Architecture
- Follow NestJS module patterns for backend organization
- Use Next.js app router for frontend structure
- Implement shared packages for common functionality
- Separate concerns between business logic and presentation

### 4. Performance Optimization
- Implement proper caching strategies with Redis
- Use database indexing for frequently queried fields
- Optimize bundle sizes with proper code splitting
- Implement lazy loading for large components

### 5. Monitoring and Observability
- Implement comprehensive logging with structured formats
- Use health checks for service monitoring
- Track key business metrics
- Set up error tracking and alerting

## Development Patterns

### Backend (NestJS) Patterns

#### Module Organization
```typescript
// Good: Feature-based modules
@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [PrescriptionController],
  providers: [PrescriptionService, PrescriptionRepository],
  exports: [PrescriptionService]
})
export class PrescriptionModule {}
```

#### Service Layer Pattern
```typescript
// Good: Separate business logic from controllers
@Injectable()
export class PrescriptionService {
  constructor(
    private readonly prescriptionRepo: PrescriptionRepository,
    private readonly drugService: DrugService
  ) {}

  async validatePrescription(prescription: CreatePrescriptionDto) {
    // Business logic here
    const drugInteractions = await this.drugService.checkInteractions(
      prescription.medications
    );
    
    if (drugInteractions.length > 0) {
      throw new BadRequestException('Drug interactions detected');
    }
    
    return this.prescriptionRepo.create(prescription);
  }
}
```

#### Error Handling
```typescript
// Good: Custom exception filters
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      message: exception.message,
      error: exception.name
    });
  }
}
```

### Frontend (Next.js) Patterns

#### Component Organization
```typescript
// Good: Co-locate related components
// apps/admin/src/components/prescriptions/
// ├── prescription-list.tsx
// ├── prescription-card.tsx
// ├── prescription-form.tsx
// └── index.ts (barrel exports)
```

#### State Management
```typescript
// Good: Use React Query for server state
export function usePrescriptions() {
  return useQuery({
    queryKey: ['prescriptions'],
    queryFn: () => apiClient.prescriptions.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Good: Use Zustand for client state
interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
}

export const useCartStore = create<CartStore>((set) => ({
  items: [],
  addItem: (item) => set((state) => ({ 
    items: [...state.items, item] 
  })),
  removeItem: (id) => set((state) => ({ 
    items: state.items.filter(item => item.id !== id) 
  })),
}));
```

### Database Patterns

#### Schema Design
```typescript
// Good: Use proper relationships and constraints
export const prescriptions = pgTable('prescriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').notNull().references(() => patients.id),
  pharmacistId: uuid('pharmacist_id').references(() => staff.id),
  status: prescriptionStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

#### Query Optimization
```typescript
// Good: Use proper indexing and selective queries
const prescriptions = await db
  .select({
    id: prescriptions.id,
    status: prescriptions.status,
    patient: {
      name: patients.name,
      phone: patients.phone
    }
  })
  .from(prescriptions)
  .leftJoin(patients, eq(prescriptions.patientId, patients.id))
  .where(eq(prescriptions.status, 'pending'))
  .limit(20);
```

## Security Best Practices

### Authentication & Authorization
- Use JWT tokens with proper expiration
- Implement role-based access control (RBAC)
- Validate user permissions at both API and UI levels
- Use secure session management for admin dashboard

### Data Protection
- Encrypt sensitive patient data at rest
- Use HTTPS for all communications
- Implement proper CORS policies
- Sanitize all user inputs to prevent XSS/SQL injection

### PDPA Compliance
- Obtain explicit consent for data collection
- Implement data retention policies
- Provide data export/deletion capabilities
- Log all access to personal data

## Testing Strategies

### Unit Testing
```typescript
// Good: Test business logic thoroughly
describe('PrescriptionService', () => {
  it('should validate prescription successfully', async () => {
    const mockPrescription = createMockPrescription();
    const result = await service.validatePrescription(mockPrescription);
    
    expect(result).toBeDefined();
    expect(result.status).toBe('validated');
  });
});
```

### Integration Testing
```typescript
// Good: Test API endpoints end-to-end
describe('Prescription API', () => {
  it('POST /prescriptions should create prescription', async () => {
    const response = await request(app.getHttpServer())
      .post('/prescriptions')
      .send(validPrescriptionData)
      .expect(201);
      
    expect(response.body.id).toBeDefined();
  });
});
```

## Performance Guidelines

### Database Performance
- Use connection pooling
- Implement proper indexing strategy
- Use read replicas for reporting queries
- Monitor slow queries and optimize

### Caching Strategy
- Cache frequently accessed data in Redis
- Use CDN for static assets
- Implement API response caching
- Cache user sessions appropriately

### Frontend Performance
- Implement code splitting by routes
- Use Next.js Image optimization
- Lazy load non-critical components
- Optimize bundle sizes with webpack-bundle-analyzer

## Deployment Best Practices

### Environment Management
- Use separate environments (dev/staging/prod)
- Implement proper CI/CD pipelines
- Use infrastructure as code (Docker/Kubernetes)
- Monitor application health and performance

### Database Migrations
- Always test migrations in staging first
- Use reversible migrations when possible
- Backup database before production migrations
- Monitor migration performance

## Troubleshooting Common Issues

### Database Connection Issues
**Problem:** Connection pool exhausted
**Solution:**
1. Check connection pool configuration
2. Monitor active connections
3. Implement connection cleanup
4. Consider increasing pool size

### LINE API Integration Issues
**Problem:** Webhook verification failures
**Solution:**
1. Verify channel secret configuration
2. Check request signature validation
3. Ensure proper HTTPS setup
4. Monitor webhook delivery logs

### Performance Issues
**Problem:** Slow API responses
**Solution:**
1. Profile database queries
2. Check for N+1 query problems
3. Implement proper caching
4. Monitor server resources

## Code Quality Standards

### Linting and Formatting
- Use ESLint with TypeScript rules
- Implement Prettier for consistent formatting
- Use Husky for pre-commit hooks
- Enforce code quality in CI/CD

### Documentation
- Document all API endpoints with Swagger
- Write clear README files for each package
- Document complex business logic
- Maintain up-to-date architecture diagrams

### Version Control
- Use conventional commit messages
- Implement proper branching strategy
- Require code reviews for all changes
- Tag releases with semantic versioning

## Monitoring and Alerting

### Application Monitoring
- Monitor API response times
- Track error rates and types
- Monitor database performance
- Set up health check endpoints

### Business Metrics
- Track prescription processing times
- Monitor order completion rates
- Track user engagement metrics
- Monitor payment success rates

### Alerting Strategy
- Set up alerts for critical errors
- Monitor system resource usage
- Alert on business metric anomalies
- Implement escalation procedures

---

**Technology Stack:** NestJS, Next.js, PostgreSQL, Redis, LINE Platform
**Compliance:** PDPA, Thai Pharmacy Regulations