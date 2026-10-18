# Day 8 Reflection

The most difficult concept in this course was designing a system that remains correct when many users perform the same operation at the same time. It is easy to check whether a seat is available, but two requests can read the same available status before either request updates it. I overcame this by studying database transactions, atomic conditional updates, and unique constraints. I learned that application-level validation alone is not enough; the database must enforce critical rules.

In my capstone, QuickNotes, I would improve the design by adding stronger automated tests, more consistent API error responses, and clearer handling of network failures. I would also improve the documentation by testing the assumptions in the architecture and capacity estimates rather than treating estimates as guaranteed performance. These changes would make the project more reliable and easier for another developer to understand.

For my next learning step, I want to study PostgreSQL transactions and isolation levels in more depth, then practice building and testing a small REST API with a relational database. I also want to learn load testing so I can measure response times and identify bottlenecks under concurrent requests. This will help me connect system-design concepts with implementation and evidence-based performance evaluation.
