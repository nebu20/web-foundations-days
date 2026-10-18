
# Library Books REST API Design

## Overview

This API manages books in a library. It supports listing books, retrieving a single book, creating, updating and deleting books, and finding books by author.

Base path: `/api/books`

## Endpoints

### 1. List all books

- **Method:** GET
- **Path:** `/api/books`
- **Description:** Returns a list of all books in the library.
- **Success status:** `200 OK`
- **Example request body:** Not required.

### 2. Get a book by ID

- **Method:** GET
- **Path:** `/api/books/{id}`
- **Description:** Returns the details of a specific book identified by its ID.
- **Success status:** `200 OK`
- **Example request body:** Not required.

### 3. Create a book

- **Method:** POST
- **Path:** `/api/books`
- **Description:** Creates a new book in the library.
- **Example request body:**

```json
{
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "publishedYear": 1958
}
```

- **Success status:** `201 Created`

### 4. Update a book

- **Method:** PUT
- **Path:** `/api/books/{id}`
- **Description:** Replaces the details of an existing book.
- **Example request body:**

```json
{
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "publishedYear": 1958
}
```

- **Success status:** `200 OK`

### 5. Delete a book

- **Method:** DELETE
- **Path:** `/api/books/{id}`
- **Description:** Deletes the specified book from the library.
- **Success status:** `204 No Content`
- **Example request body:** Not required.

### 6. List books by author

- **Method:** GET
- **Path:** `/api/books?author=Chinua%20Achebe`
- **Description:** Returns books written by the specified author using the `author` query parameter.
- **Success status:** `200 OK`
- **Example request body:** Not required.

## Error Responses

### 400 Bad Request

- **Meaning:** The request contains invalid data or parameters.
- **Example:** Creating a book without a required title or author.

### 404 Not Found

- **Meaning:** The requested resource does not exist.
- **Example:** Requesting `GET /api/books/999` when book ID `999` does not exist.
