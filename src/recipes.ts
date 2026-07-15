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
   * List available recipe categories
   */
  async listCategories(): Promise<string[]> {
    // Gateway serves category counts at /recipes/categories/counts. Accept
    // either an object map `{ category: count }` or an array of names / rows.
    const { data } = await this.synapCores._getHttpClient().get(
      '/recipes/categories/counts',
    );
    if (Array.isArray(data)) {
      return data.map((c: any) => (typeof c === 'string' ? c : c.category ?? c.name));
    }
    if (data && Array.isArray(data.categories)) {
      return data.categories.map((c: any) =>
        typeof c === 'string' ? c : c.category ?? c.name,
      );
    }
    if (data && typeof data === 'object') {
      // `{ "analytics": 3, "etl": 5 }` → ["analytics", "etl"]
      return Object.keys(data.counts ?? data);
    }
    return [];
  }
}
