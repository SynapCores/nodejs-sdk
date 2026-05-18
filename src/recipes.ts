/**
 * Recipe Management Client for SynapCores SDK
 */

import { SynapCores } from './client';
import {
  Recipe,
  RecipeInfo,
  CreateRecipeOptions,
  ListRecipesOptions,
  ExecuteRecipeOptions,
  RecipeExecutionResult,
  GenerateRecipeOptions,
  GeneratedRecipe,
} from './types/recipes';

export class RecipeClient {
  constructor(private readonly synapCores: SynapCores) {}

  /**
   * Create a new recipe
   */
  async create(options: CreateRecipeOptions): Promise<Recipe> {
    const { data } = await this.synapCores._getHttpClient().post('/recipes', {
      name: options.name,
      description: options.description,
      category: options.category,
      content: options.content,
      tags: options.tags || [],
      parameters: options.parameters || [],
    });

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      category: data.category,
      content: data.content,
      tags: data.tags || [],
      parameters: data.parameters || [],
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
      author: data.author,
      execution_count: data.execution_count,
      version: data.version,
    };
  }

  /**
   * List recipes with optional filters
   */
  async list(options: ListRecipesOptions = {}): Promise<RecipeInfo[]> {
    const params = new URLSearchParams();

    if (options.category) params.append('category', options.category);
    if (options.search) params.append('search', options.search);
    if (options.page) params.append('page', options.page.toString());
    if (options.page_size) params.append('page_size', options.page_size.toString());
    if (options.tags && options.tags.length > 0) {
      params.append('tags', options.tags.join(','));
    }

    const { data } = await this.synapCores._getHttpClient().get(
      `/recipes?${params.toString()}`
    );

    return (data.recipes || data).map((recipe: any) => ({
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      category: recipe.category,
      tags: recipe.tags || [],
      created_at: new Date(recipe.created_at),
      updated_at: new Date(recipe.updated_at),
      author: recipe.author,
      execution_count: recipe.execution_count,
    }));
  }

  /**
   * Get a specific recipe by ID
   */
  async get(id: string): Promise<Recipe> {
    const { data } = await this.synapCores._getHttpClient().get(`/recipes/${id}`);

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      category: data.category,
      content: data.content,
      tags: data.tags || [],
      parameters: data.parameters || [],
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
      author: data.author,
      execution_count: data.execution_count,
      version: data.version,
    };
  }

  /**
   * Update an existing recipe
   */
  async update(id: string, updates: Partial<CreateRecipeOptions>): Promise<Recipe> {
    const { data } = await this.synapCores._getHttpClient().put(`/recipes/${id}`, updates);

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      category: data.category,
      content: data.content,
      tags: data.tags || [],
      parameters: data.parameters || [],
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
      author: data.author,
      execution_count: data.execution_count,
      version: data.version,
    };
  }

  /**
   * Delete a recipe
   */
  async delete(id: string): Promise<void> {
    await this.synapCores._getHttpClient().delete(`/recipes/${id}`);
  }

  /**
   * Execute a recipe
   */
  async execute(options: ExecuteRecipeOptions): Promise<RecipeExecutionResult> {
    const { data } = await this.synapCores._getHttpClient().post(
      `/recipes/${options.recipe}/execute`,
      {
        parameters: options.parameters || {},
        dry_run: options.dry_run || false,
      }
    );

    return {
      id: data.id || data.execution_id,
      success: data.success,
      results: data.results,
      error: data.error,
      execution_time_ms: data.execution_time_ms || data.took_ms,
      statements_executed: data.statements_executed || 0,
    };
  }

  /**
   * Generate a recipe using AI
   */
  async generate(options: GenerateRecipeOptions): Promise<GeneratedRecipe> {
    const { data } = await this.synapCores._getHttpClient().post('/ai/generate-recipe', {
      intent: options.intent,
      category: options.category,
      context: options.context,
    });

    return {
      name: data.name,
      description: data.description,
      content: data.content,
    };
  }

  /**
   * List available recipe categories with counts.
   *
   * v0.2.0: gateway path is /recipes/categories/counts.
   * Returns the array of category names; for the {category, count}
   * payload use `listCategoriesWithCounts`.
   */
  async listCategories(): Promise<string[]> {
    const data = await this.listCategoriesWithCounts();
    return data.map((c) => c.category);
  }

  async listCategoriesWithCounts(): Promise<Array<{ category: string; count: number }>> {
    const { data } = await this.synapCores._getHttpClient().get(
      '/recipes/categories/counts',
    );
    const arr = data.categories ?? data ?? [];
    return arr.map((c: any) => ({
      category: c.category ?? c.name ?? c,
      count: c.count ?? c.recipe_count ?? 0,
    }));
  }

  /**
   * Validate a recipe payload before saving/executing.
   */
  async validate(body: { content?: string; recipe?: any; parameters?: Record<string, any> }): Promise<{
    is_valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const { data } = await this.synapCores._getHttpClient().post('/recipes/validate', body);
    return {
      is_valid: data.is_valid ?? data.valid ?? false,
      errors: data.errors ?? [],
      warnings: data.warnings ?? [],
    };
  }

  /**
   * Get execution history for a specific recipe.
   */
  async getHistory(id: string): Promise<RecipeExecutionResult[]> {
    const { data } = await this.synapCores._getHttpClient().get(`/recipes/${id}/history`);
    const arr = data.history ?? data.executions ?? data ?? [];
    return arr.map((row: any) => ({
      id: row.id ?? row.execution_id ?? '',
      success: row.success ?? row.status === 'completed',
      results: row.results,
      error: row.error,
      execution_time_ms: row.execution_time_ms ?? row.took_ms ?? 0,
      statements_executed: row.statements_executed ?? 0,
    }));
  }

  /**
   * List built-in / shared recipe templates.
   */
  async listTemplates(): Promise<RecipeInfo[]> {
    const { data } = await this.synapCores._getHttpClient().get('/recipes/templates');
    return (data.templates ?? data ?? []).map((t: any) => ({
      id: t.id,
      name: t.name,
      description: t.description ?? '',
      category: t.category ?? 'template',
      tags: t.tags ?? [],
      created_at: new Date(t.created_at ?? Date.now()),
      updated_at: new Date(t.updated_at ?? t.created_at ?? Date.now()),
      author: t.author,
      execution_count: t.execution_count,
    }));
  }

  /**
   * Get a specific recipe template.
   */
  async getTemplate(id: string): Promise<Recipe> {
    const { data } = await this.synapCores._getHttpClient().get(`/recipes/templates/${id}`);
    return {
      id: data.id,
      name: data.name,
      description: data.description ?? '',
      category: data.category ?? 'template',
      content: data.content ?? '',
      tags: data.tags ?? [],
      parameters: data.parameters ?? [],
      created_at: new Date(data.created_at ?? Date.now()),
      updated_at: new Date(data.updated_at ?? data.created_at ?? Date.now()),
      author: data.author,
      execution_count: data.execution_count,
      version: data.version,
    };
  }

  /**
   * Execute a recipe template with a parameter set.
   */
  async executeTemplate(
    id: string,
    params: Record<string, any> = {},
  ): Promise<RecipeExecutionResult> {
    const { data } = await this.synapCores._getHttpClient().post(
      `/recipes/templates/${id}/execute`,
      { parameters: params },
    );
    return {
      id: data.id ?? data.execution_id ?? '',
      success: data.success ?? false,
      results: data.results,
      error: data.error,
      execution_time_ms: data.execution_time_ms ?? data.took_ms ?? 0,
      statements_executed: data.statements_executed ?? 0,
    };
  }

  /**
   * List all recipe executions across recipes.
   */
  async listExecutions(options: { limit?: number; status?: string } = {}): Promise<
    RecipeExecutionResult[]
  > {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.status) params.append('status', options.status);
    const qs = params.toString();
    const { data } = await this.synapCores._getHttpClient().get(
      `/recipes/executions${qs ? `?${qs}` : ''}`,
    );
    const arr = data.executions ?? data ?? [];
    return arr.map((row: any) => ({
      id: row.id ?? row.execution_id ?? '',
      success: row.success ?? row.status === 'completed',
      results: row.results,
      error: row.error,
      execution_time_ms: row.execution_time_ms ?? row.took_ms ?? 0,
      statements_executed: row.statements_executed ?? 0,
    }));
  }

  /**
   * Get a single execution by ID.
   */
  async getExecution(id: string): Promise<RecipeExecutionResult> {
    const { data } = await this.synapCores._getHttpClient().get(
      `/recipes/executions/${id}`,
    );
    return {
      id: data.id ?? id,
      success: data.success ?? data.status === 'completed',
      results: data.results,
      error: data.error,
      execution_time_ms: data.execution_time_ms ?? data.took_ms ?? 0,
      statements_executed: data.statements_executed ?? 0,
    };
  }
}
