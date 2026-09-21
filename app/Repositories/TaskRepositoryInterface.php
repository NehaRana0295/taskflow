<?php

namespace App\Repositories;

use App\Models\User;
use App\Models\Task;
use Illuminate\Database\Eloquent\Collection;

interface TaskRepositoryInterface
{
    public function getForUser(User $user): Collection;
    public function createForUser(User $user, array $data): Task;
    public function findForUser(User $user, int $id): Task;
    public function update(Task $task, array $data): Task;
    public function delete(Task $task): void;
}