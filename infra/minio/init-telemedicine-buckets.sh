#!/bin/sh
# MinIO Bucket Initialization for Telemedicine 2569 Compliance
# This script creates required buckets with proper policies for data residency

set -e

echo "Initializing MinIO buckets for Telemedicine..."

# Configure MinIO client
mc alias set local http://minio:9000 ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD}

# Create telemedicine buckets
echo "Creating telemedicine-documents bucket..."
mc mb --ignore-existing local/telemedicine-documents

echo "Creating telemedicine-recordings bucket..."
mc mb --ignore-existing local/telemedicine-recordings

echo "Creating telemedicine-referrals bucket..."
mc mb --ignore-existing local/telemedicine-referrals

echo "Creating audit-reports bucket..."
mc mb --ignore-existing local/audit-reports

# Set bucket policies (private by default, no public access)
echo "Setting bucket policies..."

# Documents bucket - private, encrypted
mc anonymous set none local/telemedicine-documents

# Recordings bucket - private, immutable (WORM - Write Once Read Many)
mc anonymous set none local/telemedicine-recordings
mc retention set --default GOVERNANCE 5y local/telemedicine-recordings

# Referrals bucket - private
mc anonymous set none local/telemedicine-referrals

# Audit reports bucket - private, immutable
mc anonymous set none local/audit-reports
mc retention set --default COMPLIANCE 10y local/audit-reports

# Enable versioning for compliance
echo "Enabling versioning..."
mc version enable local/telemedicine-documents
mc version enable local/telemedicine-recordings
mc version enable local/telemedicine-referrals
mc version enable local/audit-reports

# Enable encryption at rest
echo "Enabling encryption..."
mc encrypt set sse-s3 local/telemedicine-documents
mc encrypt set sse-s3 local/telemedicine-recordings
mc encrypt set sse-s3 local/telemedicine-referrals
mc encrypt set sse-s3 local/audit-reports

echo "✓ Telemedicine MinIO buckets initialized successfully!"
echo "  - telemedicine-documents (private, encrypted, versioned)"
echo "  - telemedicine-recordings (private, encrypted, versioned, 5-year retention)"
echo "  - telemedicine-referrals (private, encrypted, versioned)"
echo "  - audit-reports (private, encrypted, versioned, 10-year retention)"
