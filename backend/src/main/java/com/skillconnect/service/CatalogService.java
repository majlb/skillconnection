package com.skillconnect.service;

import com.skillconnect.domain.*;
import com.skillconnect.dto.Dtos.*;
import com.skillconnect.dto.Mapper;
import com.skillconnect.exception.ApiException;
import com.skillconnect.repository.Repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CatalogService {

    private final CategoryRepository categories;
    private final SubjectRepository subjects;
    private final AgeGroupRepository ageGroups;

    public List<CategoryDto> activeCategories() {
        return categories.findByActiveTrueOrderByName().stream().map(Mapper::category).toList();
    }

    public List<CategoryDto> allCategories() {
        return categories.findAll().stream().map(Mapper::category).toList();
    }

    public List<SubjectDto> subjects(Long categoryId) {
        return (categoryId == null ? subjects.findAll() : subjects.findByCategoryIdOrderByName(categoryId))
                .stream().map(Mapper::subject).toList();
    }

    public List<AgeGroupDto> ageGroups() {
        return ageGroups.findAllByOrderBySortOrder().stream().map(Mapper::ageGroup).toList();
    }

    @Transactional
    public CategoryDto saveCategory(Long id, CategoryRequest req) {
        Category c = id == null ? new Category() : categories.findById(id).orElseThrow(() -> ApiException.notFound("Category"));
        c.setName(req.name());
        c.setSlug(req.slug());
        c.setIcon(req.icon());
        c.setActive(req.active());
        return Mapper.category(categories.save(c));
    }

    @Transactional
    public AgeGroupDto saveAgeGroup(Long id, AgeGroupRequest req) {
        AgeGroup a = id == null ? new AgeGroup() : ageGroups.findById(id).orElseThrow(() -> ApiException.notFound("Age group"));
        a.setCode(req.code());
        a.setLabel(req.label());
        a.setMinAge(req.minAge());
        a.setMaxAge(req.maxAge());
        a.setSortOrder(req.sortOrder());
        return Mapper.ageGroup(ageGroups.save(a));
    }

    @Transactional
    public void deleteAgeGroup(Long id) {
        ageGroups.deleteById(id);
    }
}
