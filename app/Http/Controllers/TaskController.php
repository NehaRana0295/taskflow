<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    /**
     * List only the logged-in user's tasks, newest first.
     */
    public function index(Request $request): JsonResponse
    {
        $tasks = $request->user()->tasks()->latest()->get();

        return response()->json($tasks);
    }

    /**
     * Validate the title and save a task belonging to the logged-in user.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
        ]);

        $task = $request->user()->tasks()->create($data);

        return response()->json($task->refresh(), 201);
    }

    /**
     * Update only a task owned by the logged-in user.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $task = $request->user()->tasks()->findOrFail($id);

        $data = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'completed' => ['sometimes', 'required', 'boolean'],
        ]);

        $task->update($data);

        return response()->json($task);
    }

    /**
     * Delete only a task owned by the logged-in user.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $task = $request->user()->tasks()->findOrFail($id);
        $task->delete();

        return response()->json(['message' => 'Task deleted successfully.']);
    }
}
