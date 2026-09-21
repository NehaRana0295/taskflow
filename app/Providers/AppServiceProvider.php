<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Repositories\TaskRepositoryInterface;
use App\Repositories\EloquentTaskRepository;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //“Laravel, whenever someone asks for TaskRepositoryInterface, give them an EloquentTaskRepository.”
        $this->app->bind(
            TaskRepositoryInterface::class,
            EloquentTaskRepository::class
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
