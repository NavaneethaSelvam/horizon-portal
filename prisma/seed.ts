
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();
const db = prisma as any;

const DATA_DIR = path.join(
  process.cwd(),
  "prisma",
  "data",
  "03_Data_Pack"
);

const SCHEMA_PATH = path.join(
  process.cwd(),
  "prisma",
  "schema.prisma"
);

const datasets = [
  ["departments", "department"],
  ["roles", "role"],
  ["employees", "employee"],
  ["payroll_runs", "payrollRun"],
  ["leave_types", "leaveType"],
  ["clients", "client"],
  ["teams", "team"],
  ["sprints", "sprint"],
  ["holidays", "holiday"],
  ["ai_anomaly_results", "aiAnomalyResult"],
  ["ai_attrition_risk", "aiAttritionRisk"],
  ["announcements", "announcement"],
  ["attendance_monthly", "attendanceMonthly"],
  ["chatbot_responses", "chatbotResponse"],
  ["demo_users", "demoUser"],
  ["expenses", "expense"],
  ["hr_faq", "faq"],
  ["invoices", "invoice"],
  ["leave_balances", "leaveBalance"],
  ["leave_requests", "leaveRequest"],
  ["payslips", "payslip"],
  ["tasks", "task"],
  ["vendors", "vendor"],
] as const;

type ScalarType =
  | "String"
  | "Int"
  | "Float"
  | "Boolean"
  | "DateTime"
  | "Json";

const fieldTypesCache = new Map<
  string,
  Map<string, ScalarType>
>();

function readPrismaFieldTypes(
  modelName: string
): Map<string, ScalarType> {
  const schema = fs.readFileSync(SCHEMA_PATH, "utf8");

  const escapedModelName = modelName.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  const modelBlock = schema.match(
    new RegExp(
      `model\\s+${escapedModelName}\\s*\\{([\\s\\S]*?)\\n\\}`,
      "m"
    )
  );

  if (!modelBlock) {
    throw new Error(
      `Model "${modelName}" not found in schema.prisma`
    );
  }

  const fields = new Map<string, ScalarType>();

  const supportedTypes = new Set<ScalarType>([
    "String",
    "Int",
    "Float",
    "Boolean",
    "DateTime",
    "Json",
  ]);

  for (const line of modelBlock[1].split("\n")) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("@@")) {
      continue;
    }

    const match = trimmed.match(
      /^(\w+)\s+(\w+)(?:\?)?(?:\[\])?(?:\s|$)/
    );

    if (!match) {
      continue;
    }

    const [, fieldName, typeName] = match;

    if (
      supportedTypes.has(typeName as ScalarType)
    ) {
      fields.set(fieldName, typeName as ScalarType);
    }
  }

  if (fields.size === 0) {
    throw new Error(
      `No scalar fields found for model "${modelName}"`
    );
  }

  return fields;
}

function getFieldTypes(
  modelName: string
): Map<string, ScalarType> {
  const prismaModelName =
    modelName.charAt(0).toUpperCase() +
    modelName.slice(1);

  if (!fieldTypesCache.has(modelName)) {
    fieldTypesCache.set(
      modelName,
      readPrismaFieldTypes(prismaModelName)
    );
  }

  return fieldTypesCache.get(modelName)!;
}

function normalizeRow(
  input: Record<string, any>,
  modelName: string
): Record<string, any> {
  const fieldTypes = getFieldTypes(modelName);
  const row: Record<string, any> = {};

  for (const [key, original] of Object.entries(input)) {
    // Never store demo passwords in plaintext.
    if (key === "demo_password") {
      continue;
    }

    if (!fieldTypes.has(key)) {
      throw new Error(
        `Unknown field "${key}" in model "${modelName}". ` +
        `Check the JSON dataset against schema.prisma.`
      );
    }

    if (original === null || original === undefined) {
      row[key] = null;
      continue;
    }

    const type = fieldTypes.get(key)!;

    switch (type) {
      case "String": {
        if (typeof original === "object") {
          row[key] = JSON.stringify(original);
        } else {
          row[key] = String(original);
        }
        break;
      }

      case "Int": {
        const number = Number(original);

        if (
          !Number.isFinite(number) ||
          !Number.isInteger(number)
        ) {
          throw new Error(
            `${modelName}.${key} must be an integer. ` +
            `Received: ${JSON.stringify(original)}`
          );
        }

        row[key] = number;
        break;
      }

      case "Float": {
        const number = Number(original);

        if (!Number.isFinite(number)) {
          throw new Error(
            `${modelName}.${key} must be numeric. ` +
            `Received: ${JSON.stringify(original)}`
          );
        }

        row[key] = number;
        break;
      }
case "Boolean": {
  if (typeof original === "boolean") {
    row[key] = original;
  } else if (
    original === 1 ||
    original === "1" ||
    (typeof original === "string" &&
      ["true", "yes", "y"].includes(
        original.trim().toLowerCase()
      ))
  ) {
    row[key] = true;
  } else if (
    original === 0 ||
    original === "0" ||
    (typeof original === "string" &&
      ["false", "no", "n"].includes(
        original.trim().toLowerCase()
      ))
  ) {
    row[key] = false;
  } else {
    throw new Error(
      `${modelName}.${key} must be boolean. ` +
      `Received: ${JSON.stringify(original)}`
    );
  }

  break;
}
      case "DateTime": {
        const date = new Date(original);

        if (Number.isNaN(date.getTime())) {
          throw new Error(
            `${modelName}.${key} must be a valid date. ` +
            `Received: ${JSON.stringify(original)}`
          );
        }

        row[key] = date;
        break;
      }

      case "Json":
        row[key] = original;
        break;

      default:
        row[key] = original;
    }
  }

  return row;
}

async function insertRows(
  fileName: string,
  modelName: string
): Promise<number> {
  const filePath = path.join(
    DATA_DIR,
    `${fileName}.json`
  );

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Dataset not found: ${filePath}`
    );
  }

  const parsed: unknown = JSON.parse(
    fs.readFileSync(filePath, "utf8")
  );

  if (!Array.isArray(parsed)) {
    throw new Error(
      `${fileName}.json must contain a JSON array`
    );
  }

  let rows: Record<string, any>[] = parsed.map(
    (item: Record<string, any>) => {
      const row = normalizeRow(item, modelName);

      // Insert employees before restoring manager links.
      if (modelName === "employee") {
        row.manager_id = null;
      }

      return row;
    }
  );

  if (modelName === "demoUser") {
    rows = await Promise.all(
      parsed.map(
        async (item: Record<string, any>) => {
          const row = normalizeRow(
            item,
            modelName
          );

          row.password_hash = await bcrypt.hash(
            String(item.demo_password ?? ""),
            10
          );

          return row;
        }
      )
    );
  }

  const delegate = db[modelName];

  if (
    !delegate ||
    typeof delegate.createMany !== "function"
  ) {
    throw new Error(
      `Prisma delegate "${modelName}" is unavailable. ` +
      `Run npx prisma generate and check the model name.`
    );
  }

  const batchSize = 200;

  for (
    let index = 0;
    index < rows.length;
    index += batchSize
  ) {
    await delegate.createMany({
      data: rows.slice(index, index + batchSize),
    });
  }

  console.log(
    `Loaded ${fileName}: ${rows.length} records`
  );

  return rows.length;
}

async function restoreManagerRelationships() {
  const filePath = path.join(
    DATA_DIR,
    "employees.json"
  );

  const employees = JSON.parse(
    fs.readFileSync(filePath, "utf8")
  );

  const validIds = new Set(
    employees.map(
      (employee: Record<string, any>) =>
        employee.employee_id
    )
  );

  for (const employee of employees) {
    const managerId = employee.manager_id;

    if (
      managerId &&
      managerId !== employee.employee_id &&
      validIds.has(managerId)
    ) {
      await db.employee.update({
        where: {
          employee_id: employee.employee_id,
        },
        data: {
          manager_id: managerId,
        },
      });
    }
  }

  console.log(
    "Employee manager relationships restored."
  );
}

async function main() {
  // Validate all dataset files and field names before
  // deleting any existing database records.
  for (const [fileName, modelName] of datasets) {
    const filePath = path.join(
      DATA_DIR,
      `${fileName}.json`
    );

    if (!fs.existsSync(filePath)) {
      throw new Error(
        `Dataset not found: ${filePath}`
      );
    }

    const parsed: unknown = JSON.parse(
      fs.readFileSync(filePath, "utf8")
    );

    if (!Array.isArray(parsed)) {
      throw new Error(
        `${fileName}.json must contain a JSON array`
      );
    }

    for (const item of parsed) {
      normalizeRow(
        item as Record<string, any>,
        modelName
      );
    }

    console.log(
      `Validated ${fileName}: ${parsed.length} records`
    );
  }

  console.log(
    "\nPre-validation passed. Clearing existing records..."
  );

  // Clear dependent records before parent records.
  for (
    const [fileName, modelName] of
    [...datasets].reverse()
  ) {
    await db[modelName].deleteMany();
    console.log(`Cleared ${fileName}`);
  }

  // Insert parent datasets before dependent datasets.
  for (const [fileName, modelName] of datasets) {
    await insertRows(fileName, modelName);
  }

  await restoreManagerRelationships();

  console.log(
    "\nSeed completed successfully!"
  );
}

main()
  .catch((error) => {
    console.error("\nSeed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
