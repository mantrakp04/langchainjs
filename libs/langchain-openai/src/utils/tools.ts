import { OpenAI as OpenAIClient } from "openai";

import { ToolDefinition } from "@langchain/core/language_models/base";
import { BindToolsInput } from "@langchain/core/language_models/chat_models";
import { isLangChainTool } from "@langchain/core/utils/function_calling";
import { isZodSchemaV3 } from "@langchain/core/utils/types";
import { zodFunction } from "openai/helpers/zod";
import { formatToOpenAITool } from "./openai.js";

/**
 * Formats a tool in either OpenAI format, or LangChain structured tool format
 * into an OpenAI tool format. If the tool is already in OpenAI format, return without
 * any changes. If it is in LangChain structured tool format, convert it to OpenAI tool format
 * using OpenAI's `zodFunction` util, falling back to `convertToOpenAIFunction` if the parameters
 * returned from the `zodFunction` util are not defined.
 *
 * @param {BindToolsInput} tool The tool to convert to an OpenAI tool.
 * @param {Object} [fields] Additional fields to add to the OpenAI tool.
 * @returns {ToolDefinition} The inputted tool in OpenAI tool format.
 */
export function _convertToOpenAITool(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tool: BindToolsInput,
  fields?: {
    /**
     * If `true`, model output is guaranteed to exactly match the JSON Schema
     * provided in the function definition.
     */
    strict?: boolean;
  }
): OpenAIClient.ChatCompletionTool {
  let toolDef: OpenAIClient.ChatCompletionTool | undefined;

  if (isLangChainTool(tool)) {
    // FIXME: This is a hack to use OpenAI's native zodFunction util
    // since their json schema standard is not always compatible with
    // the schemas produced by zod. Ideally, we should be using the
    // `zodFunction` util always, but that can only happen when OpenAI
    // supports zod v4.
    if (isZodSchemaV3(tool.schema)) {
      toolDef = zodFunction({
        name: tool.name,
        parameters: tool.schema,
        description: tool.description,
      });
    } else {
      toolDef = formatToOpenAITool(tool);
    }
  } else {
    toolDef = tool as ToolDefinition;
  }

  if (fields?.strict !== undefined) {
    toolDef.function.strict = fields.strict;
  }

  return toolDef;
}
