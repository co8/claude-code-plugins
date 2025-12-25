import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import yaml from "js-yaml";

// Configuration schema for validation
export const CONFIG_SCHEMA = {
  bot_token: { type: "string", required: true, minLength: 10 },
  chat_id: { type: "string", required: true, pattern: /^-?\d+$/ },
  timeout_seconds: { type: "number", min: 10, max: 3600, default: 600 },
  logging_level: {
    type: "string",
    enum: ["all", "errors", "none"],
    default: "errors",
  },
  batch_window_seconds: { type: "number", min: 5, max: 300, default: 30 },
  rate_limiting: {
    type: "object",
    properties: {
      messages_per_minute: { type: "number", min: 1, max: 30, default: 20 },
      burst_size: { type: "number", min: 1, max: 10, default: 5 },
    },
  },
  notifications: {
    type: "object",
    properties: {
      todo_completions: { type: "boolean", default: true },
      errors: { type: "boolean", default: true },
      session_events: { type: "boolean", default: true },
      smart_detection: { type: "boolean", default: true },
    },
  },
  smart_keywords: {
    type: "array",
    default: [
      "suggest",
      "recommend",
      "discovered",
      "insight",
      "clarify",
      "important",
      "note",
      "warning",
    ],
  },
};

// Configuration discovery
export function getConfigPath() {
  const projectDir = process.env.CLAUDE_PROJECT_DIR;

  // Try project-specific config first
  if (projectDir) {
    const projectConfig = join(projectDir, ".claude", "telegram.local.md");
    if (existsSync(projectConfig)) {
      console.log(
        `[telegram-bot] Using project-specific config: ${projectConfig}`
      );
      return projectConfig;
    }
  }

  // Fall back to global config
  const globalConfig = join(homedir(), ".claude", "telegram.local.md");
  if (existsSync(globalConfig)) {
    console.log(`[telegram-bot] Using global config: ${globalConfig}`);
    return globalConfig;
  }

  throw new Error(
    "No configuration file found. Expected one of:\n" +
      (projectDir
        ? `  - ${join(projectDir, ".claude", "telegram.local.md")}\n`
        : "") +
      `  - ${join(homedir(), ".claude", "telegram.local.md")}`
  );
}

// Validate configuration value against schema
export function validateConfigValue(key, value, schema) {
  if (schema.type === "string") {
    if (typeof value !== "string") return `${key} must be a string`;
    if (schema.minLength && value.length < schema.minLength)
      return `${key} must be at least ${schema.minLength} characters`;
    if (schema.pattern && !schema.pattern.test(value))
      return `${key} has invalid format`;
    if (schema.enum && !schema.enum.includes(value))
      return `${key} must be one of: ${schema.enum.join(", ")}`;
  } else if (schema.type === "number") {
    if (typeof value !== "number") return `${key} must be a number`;
    if (schema.min !== undefined && value < schema.min)
      return `${key} must be at least ${schema.min}`;
    if (schema.max !== undefined && value > schema.max)
      return `${key} must be at most ${schema.max}`;
  } else if (schema.type === "boolean") {
    if (typeof value !== "boolean") return `${key} must be a boolean`;
  } else if (schema.type === "array") {
    if (!Array.isArray(value)) return `${key} must be an array`;
  }
  return null;
}

// Load configuration from .local.md file with validation
export function loadConfig(configPath) {
  if (!existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }

  const content = readFileSync(configPath, "utf-8");
  const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!yamlMatch) {
    throw new Error("No YAML frontmatter found in configuration file");
  }

  // Parse YAML using js-yaml library for robust parsing
  let parsedConfig;
  try {
    parsedConfig = yaml.load(yamlMatch[1]);
  } catch (err) {
    throw new Error(`Invalid YAML in configuration file: ${err.message}`);
  }

  // Apply defaults and validate
  const config = {
    bot_token: parsedConfig.bot_token || "",
    chat_id: parsedConfig.chat_id || "",
    timeout_seconds:
      parsedConfig.timeout_seconds ?? CONFIG_SCHEMA.timeout_seconds.default,
    logging_level:
      parsedConfig.logging_level || CONFIG_SCHEMA.logging_level.default,
    batch_window_seconds:
      parsedConfig.batch_window_seconds ??
      CONFIG_SCHEMA.batch_window_seconds.default,
    rate_limiting: {
      messages_per_minute:
        parsedConfig.rate_limiting?.messages_per_minute ??
        CONFIG_SCHEMA.rate_limiting.properties.messages_per_minute.default,
      burst_size:
        parsedConfig.rate_limiting?.burst_size ??
        CONFIG_SCHEMA.rate_limiting.properties.burst_size.default,
    },
    notifications: {
      todo_completions: parsedConfig.notifications?.todo_completions ?? true,
      errors: parsedConfig.notifications?.errors ?? true,
      session_events: parsedConfig.notifications?.session_events ?? true,
      smart_detection: parsedConfig.notifications?.smart_detection ?? true,
    },
    smart_keywords:
      parsedConfig.smart_keywords || CONFIG_SCHEMA.smart_keywords.default,
  };

  // Validate required fields
  const errors = [];

  for (const [key, schema] of Object.entries(CONFIG_SCHEMA)) {
    if (schema.type === "object") {
      // Validate nested object properties
      if (schema.properties) {
        const nestedObj = config[key];
        for (const [propKey, propSchema] of Object.entries(schema.properties)) {
          const propValue = nestedObj?.[propKey];
          if (propValue !== undefined && propValue !== null) {
            const error = validateConfigValue(`${key}.${propKey}`, propValue, propSchema);
            if (error) errors.push(error);
          }
        }
      }
      continue;
    }

    const value = config[key];

    if (schema.required && (!value || value === "")) {
      errors.push(`${key} is required`);
      continue;
    }

    if (value !== undefined && value !== "") {
      const error = validateConfigValue(key, value, schema);
      if (error) errors.push(error);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Configuration validation failed:\n  - ${errors.join("\n  - ")}`
    );
  }

  return config;
}
