/**
 * Recipe Management Types
 */

export interface RecipeInfo {
  /** Recipe ID */
  id: string;

  /** Recipe name */
  name: string;

  /** Recipe description */
  description: string;

  /** Recipe category */
  category: string;

  /** Recipe tags */
  tags: string[];

  /** Creation timestamp */
  created_at: Date;

  /** Last update timestamp */
  updated_at: Date;

  /** Author/creator */
  author?: string;

  /** Execution count */
  execution_count?: number;
}

export interface Recipe extends RecipeInfo {
  /** Recipe content (markdown) */
  content: string;

  /** Recipe parameters */
  parameters?: RecipeParameter[];

  /** Recipe version */
  version?: string;
}

export interface RecipeParameter {
  /** Parameter name */
  name: string;

  /** Parameter type */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';

  /** Parameter description */
  description?: string;

  /** Whether parameter is required */
  required?: boolean;

  /** Default value */
  default?: any;

  /** Validation pattern (for strings) */
  pattern?: string;
}

export interface CreateRecipeOptions {
  /** Recipe name */
  name: string;

  /** Recipe description */
  description: string;

  /** Recipe category */
  category: string;

  /** Recipe content (markdown) */
  content: string;

  /** Recipe tags */
  tags?: string[];

  /** Recipe parameters */
  parameters?: RecipeParameter[];
}

export interface ListRecipesOptions {
  /** Filter by category */
  category?: string;

  /** Filter by tags */
  tags?: string[];

  /** Search query */
  search?: string;

  /** Page number */
  page?: number;

  /** Page size */
  page_size?: number;
}

export interface ExecuteRecipeOptions {
  /** Recipe ID or name */
  recipe: string;

  /** Recipe parameters */
  parameters?: Record<string, any>;

  /** Dry run (don't execute, just validate) */
  dry_run?: boolean;
}

export interface RecipeExecutionResult {
  /** Execution ID */
  id: string;

  /** Whether execution succeeded */
  success: boolean;

  /** Results from SQL execution */
  results?: any[];

  /** Error message if failed */
  error?: string;

  /** Execution time in milliseconds */
  execution_time_ms: number;

  /** Number of statements executed */
  statements_executed: number;
}

export interface GenerateRecipeOptions {
  /** User's intent/description */
  intent: string;

  /** Recipe category */
  category: string;

  /** Optional context about database schema */
  context?: string;
}

export interface GeneratedRecipe {
  /** Generated recipe name */
  name: string;

  /** Generated recipe description */
  description: string;

  /** Generated recipe content (markdown) */
  content: string;
}
