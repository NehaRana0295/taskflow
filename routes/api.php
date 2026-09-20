<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return response()->json([
        'user' => $request->user()->only(['id', 'name', 'email']),
    ]);
})->middleware('auth:sanctum');