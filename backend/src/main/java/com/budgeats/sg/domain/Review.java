package com.budgeats.sg.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** 자체 리뷰 (CLAUDE.md 4절). 동일 사용자·식당 조합은 1건만 허용된다. */
@Entity
@Table(name = "reviews", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "place_id"}))
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "place_id", nullable = false)
    private String placeId;

    @Column(nullable = false)
    private int rating;

    @Column(name = "price_per_person", nullable = false)
    private BigDecimal pricePerPerson;

    @Column(nullable = false, length = 1000)
    private String content;

    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "taste_tags")
    private List<String> tasteTags = List.of();

    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "student_tags")
    private List<String> studentTags = List.of();

    @Enumerated(EnumType.STRING)
    @Column(name = "visit_type", nullable = false)
    private VisitType visitType;

    @Column(nullable = false)
    private boolean revisit;

    @Column(name = "is_anonymous", nullable = false)
    private boolean anonymous;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Review() {
    }

    public Review(
            User user,
            String placeId,
            int rating,
            BigDecimal pricePerPerson,
            String content,
            List<String> tasteTags,
            List<String> studentTags,
            VisitType visitType,
            boolean revisit,
            boolean anonymous
    ) {
        this.user = user;
        this.placeId = placeId;
        this.rating = rating;
        this.pricePerPerson = pricePerPerson;
        this.content = content;
        this.tasteTags = tasteTags == null ? List.of() : tasteTags;
        this.studentTags = studentTags == null ? List.of() : studentTags;
        this.visitType = visitType;
        this.revisit = revisit;
        this.anonymous = anonymous;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public void update(
            int rating,
            BigDecimal pricePerPerson,
            String content,
            List<String> tasteTags,
            List<String> studentTags,
            VisitType visitType,
            boolean revisit,
            boolean anonymous
    ) {
        this.rating = rating;
        this.pricePerPerson = pricePerPerson;
        this.content = content;
        this.tasteTags = tasteTags == null ? List.of() : tasteTags;
        this.studentTags = studentTags == null ? List.of() : studentTags;
        this.visitType = visitType;
        this.revisit = revisit;
        this.anonymous = anonymous;
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public String getPlaceId() {
        return placeId;
    }

    public int getRating() {
        return rating;
    }

    public BigDecimal getPricePerPerson() {
        return pricePerPerson;
    }

    public String getContent() {
        return content;
    }

    public List<String> getTasteTags() {
        return tasteTags;
    }

    public List<String> getStudentTags() {
        return studentTags;
    }

    public VisitType getVisitType() {
        return visitType;
    }

    public boolean isRevisit() {
        return revisit;
    }

    public boolean isAnonymous() {
        return anonymous;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
