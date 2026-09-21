<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class TaskApiTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_guests_receive_401_when_listing_tasks(): void
    {
        $this->getJson('/api/tasks')->assertUnauthorized();
    }

    public function test_guests_receive_401_when_creating_tasks(): void
    {
        $this->postJson('/api/tasks', ['title' => 'Study PHP'])->assertUnauthorized();

        $this->assertDatabaseCount('tasks', 0);
    }

    public function test_users_only_see_their_own_tasks(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $task = $user->tasks()->create(['title' => 'My task']);
        $otherUser->tasks()->create(['title' => 'Private task']);

        $response = $this->actingAs($user)->getJson('/api/tasks');

        $response->assertOk()->assertJsonCount(1)->assertJsonPath('0.id', $task->id);
    }

    public function test_creating_a_task_uses_the_authenticated_owner_and_default_completion(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/tasks', [
            'title' => 'Study PHP',
            'user_id' => $otherUser->id,
            'completed' => true,
        ]);

        $response->assertCreated()
            ->assertJsonPath('title', 'Study PHP')
            ->assertJsonPath('user_id', $user->id);

        $this->assertDatabaseHas('tasks', [
            'id' => $response->json('id'),
            'user_id' => $user->id,
            'title' => 'Study PHP',
            'completed' => false,
        ]);
        $this->assertDatabaseCount('tasks', 1);
    }

    public function test_invalid_titles_receive_422_without_creating_tasks(): void
    {
        $user = User::factory()->create();

        foreach (['', 123, str_repeat('a', 256)] as $title) {
            $this->actingAs($user)->postJson('/api/tasks', ['title' => $title])
                ->assertUnprocessable()
                ->assertJsonValidationErrors('title');
        }

        $this->assertDatabaseCount('tasks', 0);
    }

    public function test_guests_cannot_edit_or_delete_tasks(): void
    {
        $this->patchJson('/api/tasks/1', ['completed' => true])->assertUnauthorized();
        $this->deleteJson('/api/tasks/1')->assertUnauthorized();
    }

    public function test_owner_can_edit_a_task_without_transferring_ownership(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $task = $user->tasks()->create(['title' => 'Original']);

        $this->actingAs($user)->patchJson('/api/tasks/'.$task->id, [
            'title' => 'Updated',
            'completed' => true,
            'user_id' => $other->id,
        ])->assertOk()->assertJsonPath('completed', true)->assertJsonPath('title', 'Updated');

        $this->assertDatabaseHas('tasks', [
            'id' => $task->id, 'user_id' => $user->id, 'title' => 'Updated', 'completed' => true,
        ]);
    }

    public function test_partial_update_preserves_the_title(): void
    {
        $user = User::factory()->create();
        $task = $user->tasks()->create(['title' => 'Original']);

        $this->actingAs($user)->patchJson('/api/tasks/'.$task->id, ['completed' => true])
            ->assertOk()->assertJsonPath('title', 'Original');

        $this->assertDatabaseHas('tasks', ['id' => $task->id, 'title' => 'Original', 'completed' => true]);
    }

    public function test_invalid_edits_receive_422_and_leave_task_unchanged(): void
    {
        $user = User::factory()->create();
        $task = $user->tasks()->create(['title' => 'Original', 'completed' => false]);

        foreach ([
            ['title' => ''], ['title' => 123], ['title' => str_repeat('a', 256)],
            ['completed' => null], ['completed' => 'invalid'],
        ] as $payload) {
            $this->actingAs($user)->patchJson('/api/tasks/'.$task->id, $payload)
                ->assertUnprocessable()->assertJsonValidationErrors(array_keys($payload));
        }

        $this->assertDatabaseHas('tasks', ['id' => $task->id, 'title' => 'Original', 'completed' => false]);
    }

    public function test_other_users_cannot_edit_or_delete_a_task(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $task = $owner->tasks()->create(['title' => 'Private']);

        $this->actingAs($other)->patchJson('/api/tasks/'.$task->id, ['title' => 'Changed'])->assertNotFound();
        $this->actingAs($other)->deleteJson('/api/tasks/'.$task->id)->assertNotFound();

        $this->assertDatabaseHas('tasks', ['id' => $task->id, 'title' => 'Private', 'user_id' => $owner->id]);
    }

    public function test_owner_can_delete_a_task(): void
    {
        $user = User::factory()->create();
        $task = $user->tasks()->create(['title' => 'Remove me']);

        $this->actingAs($user)->deleteJson('/api/tasks/'.$task->id)
            ->assertOk()->assertJsonPath('message', 'Task deleted successfully.');

        $this->assertDatabaseMissing('tasks', ['id' => $task->id]);
    }

    public function test_missing_tasks_receive_404_on_edit_and_delete(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->patchJson('/api/tasks/999', ['title' => 'Missing'])->assertNotFound();
        $this->actingAs($user)->deleteJson('/api/tasks/999')->assertNotFound();
    }
}
