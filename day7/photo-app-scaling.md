# SnapShare: Photo-Sharing App Scaling Plan

## 1. Assumptions

SnapShare is a photo-sharing application where users upload photos and browse a feed containing photos from people they follow.

The following assumptions are used for capacity planning:

- Registered users: 10,000,000.
- Daily active users (DAU): 10% of registered users.
- Each daily active user uploads 1 photo per day.
- Each daily active user views 50 feed pages per day.
- Average original photo size: 2 MB.
- Each photo has one thumbnail of 50 KB.
- One year has 365 days.
- Average request rates are calculated over 86,400 seconds per day.
- Peak feed traffic is estimated at 5 times the average rate.
- For simplicity, all daily active users are assumed to perform their stated activities each day, and all uploaded photos are retained for one year.
- Storage calculations use decimal units: 1 GB = 1,000 MB and 1 TB = 1,000 GB. Replication, backups, metadata, and storage overhead are excluded unless stated otherwise.

## 2. Traffic and Storage Estimates

### Daily active users

Daily active users = Registered users × Daily active percentage

10,000,000 × 10% = **1,000,000 daily active users**

### Photo uploads per second

Daily uploads = 1,000,000 active users × 1 photo

Daily uploads = **1,000,000 photos**

Average uploads per second = 1,000,000 ÷ 86,400

Average uploads per second ≈ **11.57 photos/second**

This is the average rate; actual upload traffic may be higher during busy periods.

### Feed views per second

Daily feed views = 1,000,000 active users × 50 feed pages

Daily feed views = **50,000,000 feed pages**

Average feed views per second = 50,000,000 ÷ 86,400

Average feed views per second ≈ **578.7 feed pages/second**

Peak feed views per second = 578.7 × 5

Peak feed views per second ≈ **2,894 feed pages/second**

The design should therefore handle approximately 2,900 feed-page requests per second at the estimated peak, with additional capacity for unexpected spikes.

### Photo storage per year

Original photo storage per day:

1,000,000 photos × 2 MB = **2,000,000 MB = 2,000 GB = 2 TB/day**

Original photo storage per year:

2 TB/day × 365 = **730 TB/year**

Thumbnail storage per day:

1,000,000 × 50 KB = 50,000,000 KB = **50 GB/day**

Thumbnail storage per year:

50 GB/day × 365 = **18.25 TB/year**

Total new photo and thumbnail storage per year:

730 TB + 18.25 TB = **748.25 TB/year**

This estimate excludes backups, replication, metadata, and storage overhead. If photos are retained across multiple years, total storage will continue to grow.

## 3. Is SnapShare Read-Heavy or Write-Heavy?

SnapShare is **read-heavy** based on the estimated application operations. Users generate 50 million feed-page views daily but only 1 million photo uploads daily, giving a ratio of approximately 50 feed views per upload.

This means the architecture should prioritize fast feed delivery, caching, efficient database reads, and a content delivery network (CDN). Uploads still require reliable processing and substantial storage capacity, but feed reads are likely to create the greater request volume. A feed-page view is not necessarily one database query because caching and batching can reduce the work required for each view.

## 4. Why Photos Belong in Object Storage

Photo files should be stored in object storage rather than directly inside the relational database. Images are large binary files, and placing them in database rows can increase database size, backup time, replication traffic, and the cost of serving files. Object storage is designed to store large files durably and at scale, while a database can store photo metadata such as the photo ID, owner, caption, upload time, object-storage key, and thumbnail key.

The application can keep metadata and relationships in the database while serving image files through a CDN backed by object storage.

## 5. Proposed Architecture

```text
                         +----------------------+
                         |        Users         |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         |          CDN         |
                         | Cached photos/images |
                         +----------+-----------+
                                    |
                         Cache miss / API request
                                    |
                                    v
                         +----------------------+
                         |    Load Balancer     |
                         +----------+-----------+
                                    |
                     +--------------+--------------+
                     |              |              |
                     v              v              v
                +---------+    +---------+    +---------+
                | App     |    | App     |    | App     |
                | Server  |    | Server  |    | Server  |
                +----+----+    +----+----+    +----+----+
                     |              |              |
                     +--------------+--------------+
                                    |
                    +---------------+----------------+
                    |                                |
                    v                                v
           +------------------+             +------------------+
           | Shared Cache     |             | Primary Database |
           | Feed/metadata    |             | Users, follows,  |
           | Redis            |             | photo metadata   |
           +------------------+             +--------+---------+
                                                     |
                                                     | Replication
                                                     v
                                            +------------------+
                                            | Read Replica     |
                                            | Feed/read queries |
                                            +------------------+

Photo upload processing:
 App Server -----> Object Storage (original photo)
      |
      +----------> Message Queue
                       |
                       v
                +----------------+
                | Thumbnail      |
                | Worker         |
                +-------+--------+
                        |
                        +-------> Object Storage (thumbnail)
                        |
                        +-------> Update photo metadata/status
                                  in Primary Database
```

## 6. What Each Component Solves

- **CDN:** Delivers frequently requested photos and thumbnails from locations closer to users, reducing latency and origin-server traffic.
- **Load balancer:** Distributes incoming API requests across available application servers to prevent one server from becoming overloaded.
- **Application servers:** Run business logic, authenticate users, validate uploads, build feeds, and coordinate the database, cache, queue, and object storage.
- **Shared cache (Redis):** Keeps frequently accessed feed data and metadata in fast memory to reduce repeated database queries.
- **Primary database:** Stores structured information such as users, follow relationships, photo metadata, captions, and upload status.
- **Read replica:** Serves suitable read queries so feed traffic does not place all read load on the primary database; replication lag must be considered.
- **Object storage:** Stores original photos and generated thumbnails durably without filling the application database with large image files.
- **Message queue:** Holds thumbnail-generation jobs so uploading a photo does not have to wait for image processing to finish.
- **Thumbnail worker:** Processes queued jobs, generates smaller image versions, stores them in object storage, and updates their metadata or processing status.

## 7. Step-by-Step Photo Upload Flow

1. The user selects a photo and submits it through the SnapShare client.
2. The application server authenticates the user and validates the file type, size, and upload permissions.
3. The server creates a photo record in the primary database with an upload status such as `PROCESSING`.
4. The original photo is uploaded to object storage, preferably using a secure, time-limited upload URL when appropriate.
5. After the original upload succeeds, a thumbnail-generation job is published to the message queue.
6. The application confirms that the original photo has been uploaded and indicates that thumbnail processing may still be in progress.
7. A thumbnail worker consumes the job, downloads or reads the original photo, and generates the 50 KB thumbnail.
8. The worker stores the thumbnail in object storage and updates the database with its storage key and a completed processing status.
9. When followers request their feeds, the application retrieves relevant photo metadata and thumbnail URLs, using the cache and read replica where appropriate.
10. The CDN serves cached thumbnails and photos; when an image is not cached, it retrieves the object from the origin storage path.

The queue allows thumbnail processing to happen asynchronously. Failed jobs should be retried safely, with a dead-letter queue or equivalent mechanism for jobs that repeatedly fail.

## 8. Trade-Offs

### Trade-off 1: Cache speed versus data freshness

Caching reduces database load and makes feeds faster, but cached data can become stale when a user uploads a photo, changes a caption, or unfollows someone. Cache expiration, invalidation, and short-lived feed entries can help, but they add implementation complexity.

### Trade-off 2: Read replicas versus consistency

A read replica increases read capacity and reduces pressure on the primary database. However, replication can lag, meaning a newly uploaded photo or updated profile may not immediately appear in replica-backed queries. Important operations may need to read from the primary database when fresh data is required.

### Trade-off 3: Asynchronous thumbnails versus immediate availability

Using a queue improves upload responsiveness and lets thumbnail workers scale independently. However, thumbnails may not be ready immediately, and the system must handle delayed or failed jobs, retries, and duplicate processing safely.

### Trade-off 4: Object storage and CDN versus operational complexity

Object storage and a CDN scale photo delivery efficiently and reduce application-server bandwidth, but they introduce additional configuration, access-control, cache-invalidation, and storage-cost considerations. Private photos may require signed URLs or authorization-aware delivery.

### Trade-off 5: Precomputed feeds versus storage and update costs

Precomputing feeds can make reads faster, but it consumes extra storage and requires updating many followers' feeds whenever a user posts a photo. Generating feeds on demand reduces precomputation work but can increase read latency and database load.

## 9. Conclusion

SnapShare should use a horizontally scalable application tier, a shared cache, a primary database with a read replica, object storage for photos, a CDN for delivery, and a queue-based thumbnail-processing pipeline. With an estimated 1 million daily active users, 11.57 average uploads per second, 578.7 average feed views per second, and 748.25 TB of new photo and thumbnail data per year, the system should optimize feed reads while ensuring reliable uploads and asynchronous image processing. These estimates are planning baselines; production capacity should be validated through load testing, monitoring, and real usage data.
