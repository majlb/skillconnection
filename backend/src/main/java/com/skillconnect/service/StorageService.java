package com.skillconnect.service;

import com.skillconnect.config.AppProperties;
import com.skillconnect.exception.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.UUID;

/**
 * Local-disk storage. In Azure this directory is backed by an Azure Files volume; swap for a Blob Storage
 * implementation (with SAS URLs for private documents) when scaling out.
 */
@Service
public class StorageService {

    public enum Bucket { AVATARS, DOCUMENTS }

    private static final Map<String, String> IMAGE_TYPES = Map.of("image/jpeg", "jpg", "image/png", "png", "image/webp", "webp");
    private static final Map<String, String> DOC_TYPES = Map.of("application/pdf", "pdf", "image/jpeg", "jpg", "image/png", "png");

    private final Path root;

    public StorageService(AppProperties props) {
        this.root = Path.of(props.storage().uploadDir()).toAbsolutePath().normalize();
    }

    /** Stores the file under a random name and returns that name. */
    public String store(Bucket bucket, MultipartFile file) {
        Map<String, String> allowed = bucket == Bucket.AVATARS ? IMAGE_TYPES : DOC_TYPES;
        String ext = allowed.get(file.getContentType());
        if (ext == null || file.isEmpty()) {
            throw ApiException.badRequest("Unsupported file type");
        }
        String name = UUID.randomUUID() + "." + ext;
        try (InputStream in = file.getInputStream()) {
            Path dir = root.resolve(bucket.name().toLowerCase());
            Files.createDirectories(dir);
            Files.copy(in, dir.resolve(name), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new IllegalStateException("Could not store file", e);
        }
        return name;
    }

    public Path resolve(Bucket bucket, String name) {
        Path dir = root.resolve(bucket.name().toLowerCase());
        Path file = dir.resolve(name).normalize();
        if (!file.startsWith(dir) || !Files.exists(file)) {
            throw ApiException.notFound("File");
        }
        return file;
    }
}
