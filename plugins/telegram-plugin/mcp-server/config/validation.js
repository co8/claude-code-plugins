// Input validation helpers for MCP tool calls

export function validateSendMessage(args) {
  if (!args.text || typeof args.text !== "string") {
    throw new Error('Invalid input: "text" must be a non-empty string');
  }

  if (args.priority && !["low", "normal", "high"].includes(args.priority)) {
    throw new Error(
      'Invalid input: "priority" must be one of: low, normal, high'
    );
  }
}

export function validateApprovalRequest(args) {
  if (!args.question || typeof args.question !== "string") {
    throw new Error('Invalid input: "question" must be a non-empty string');
  }

  if (!Array.isArray(args.options) || args.options.length === 0) {
    throw new Error('Invalid input: "options" must be a non-empty array');
  }

  for (let i = 0; i < args.options.length; i++) {
    const opt = args.options[i];
    if (!opt || typeof opt !== "object") {
      throw new Error(`Invalid input: option at index ${i} must be an object`);
    }
    if (!opt.label || typeof opt.label !== "string") {
      throw new Error(
        `Invalid input: option at index ${i} must have a "label" string`
      );
    }
    if (!opt.description || typeof opt.description !== "string") {
      throw new Error(
        `Invalid input: option at index ${i} must have a "description" string`
      );
    }
  }

  if (args.header && typeof args.header !== "string") {
    throw new Error('Invalid input: "header" must be a string if provided');
  }
}

export function validatePollResponse(args) {
  if (!args.approval_id || typeof args.approval_id !== "string") {
    throw new Error('Invalid input: "approval_id" must be a non-empty string');
  }

  if (
    args.timeout_seconds !== undefined &&
    (typeof args.timeout_seconds !== "number" || args.timeout_seconds <= 0)
  ) {
    throw new Error(
      'Invalid input: "timeout_seconds" must be a positive number'
    );
  }
}

export function validateBatchNotifications(args) {
  if (!Array.isArray(args.messages) || args.messages.length === 0) {
    throw new Error('Invalid input: "messages" must be a non-empty array');
  }

  for (let i = 0; i < args.messages.length; i++) {
    const msg = args.messages[i];
    if (!msg || typeof msg !== "object") {
      throw new Error(`Invalid input: message at index ${i} must be an object`);
    }
    if (!msg.text || typeof msg.text !== "string") {
      throw new Error(
        `Invalid input: message at index ${i} must have a "text" string`
      );
    }
    if (msg.priority && !["low", "normal", "high"].includes(msg.priority)) {
      throw new Error(
        `Invalid input: message at index ${i} has invalid priority (must be: low, normal, high)`
      );
    }
  }
}
