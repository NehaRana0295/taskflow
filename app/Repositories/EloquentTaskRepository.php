<?php

namespace App\Repositories;

use App\Models\User;
use App\Models\Task;
use Illuminate\Database\Eloquent\Collection;

//For now, remember just this: the repository does the database work; the interface describes the methods it must provide.

class EloquentTaskRepository implements TaskRepositoryInterface
{
    public function getForUser(User $user): Collection
    {
        return $user->tasks()->latest()->get();
    }

    public function createForUser(User $user, array $data): Task
    {
        return $user->tasks()->create($data);
    }

    public function findForUser(User $user, int $id): Task
    {
        return $user->tasks()->findOrFail($id);
    }

    public function update(Task $task, array $data): Task
    {
        $task->update($data);

        return $task;
    }

    public function delete(Task $task): void
    {
        $task->delete();
    }

}