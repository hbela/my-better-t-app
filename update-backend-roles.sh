#!/bin/bash

# Script to update all role references in backend code
# Run this after Prisma migration is complete

echo "🔄 Updating backend role references..."

FILE="apps/server/src/index.ts"

# Backup first
cp "$FILE" "$FILE.backup"
echo "✅ Created backup: $FILE.backup"

# Replace systemRole with role
sed -i 's/user\.systemRole/user.role/g' "$FILE"
sed -i 's/session\.user\.systemRole/session.user.role/g' "$FILE"
sed -i 's/context\.data\.user\.systemRole/context.data.user.role/g' "$FILE"
sed -i 's/systemRole:/role:/g' "$FILE"
sed -i 's/systemRole =/role =/g' "$FILE"
sed -i 's/systemRole"/role"/g' "$FILE"
sed -i 's/systemRole: "USER"/role: "CLIENT"/g' "$FILE"
sed -i 's/systemRole: "ADMIN"/role: "ADMIN"/g' "$FILE"
sed -i 's/systemRole = "USER"/role = "CLIENT"/g' "$FILE"
sed -i 's/systemRole = "ADMIN"/role = "ADMIN"/g' "$FILE"
sed -i 's/systemRole !== "ADMIN"/role !== "ADMIN"/g' "$FILE"
sed -i 's/systemRole === "ADMIN"/role === "ADMIN"/g' "$FILE"

# Replace member.role checks with user.role
sed -i 's/member\.role !== "owner"/user.role !== "OWNER"/g' "$FILE"
sed -i 's/member\.role !== "owner"/user.role !== "OWNER"/g' "$FILE"
sed -i 's/member\.role === "owner"/user.role === "OWNER"/g' "$FILE"

# Remove role assignments in Member.create
sed -i 's/role: "owner",//g' "$FILE"
sed -i 's/role: "provider",//g' "$FILE"
sed -i 's/role: "member",//g' "$FILE"

# Update role values to uppercase
sed -i 's/"USER"/"CLIENT"/g' "$FILE"

echo "✅ Updated backend role references"
echo "📝 Review changes and test thoroughly"
echo "⚠️  Backup available at: $FILE.backup"

