INSERT INTO roles (name) VALUES ('CUSTOMER'), ('INSTRUCTOR'), ('ADMIN');

INSERT INTO categories (name, slug, icon) VALUES
    ('School Subjects',        'school-subjects',       'book-open'),
    ('Languages',              'languages',             'languages'),
    ('Music',                  'music',                 'music'),
    ('Sports',                 'sports',                'dumbbell'),
    ('Art',                    'art',                   'palette'),
    ('Programming',            'programming',           'code'),
    ('Exam Preparation',       'exam-preparation',      'clipboard-check'),
    ('University Tutoring',    'university-tutoring',   'graduation-cap'),
    ('Special Education',      'special-education',     'heart-handshake'),
    ('Private Coaching',       'private-coaching',      'target'),
    ('Home Services',          'home-services',         'home'),
    ('Professional Consulting','professional-consulting','briefcase');

INSERT INTO age_groups (code, label, min_age, max_age, sort_order) VALUES
    ('AGE_4_6',   '4-6 years',   4,  6,    1),
    ('AGE_7_10',  '7-10 years',  7,  10,   2),
    ('AGE_11_14', '11-14 years', 11, 14,   3),
    ('AGE_15_18', '15-18 years', 15, 18,   4),
    ('ADULTS',    'Adults',      18, NULL, 5);

INSERT INTO subjects (category_id, name, slug)
SELECT c.id, s.name, s.slug FROM (VALUES
    ('school-subjects', 'Mathematics', 'mathematics'),
    ('school-subjects', 'Physics',     'physics'),
    ('school-subjects', 'Chemistry',   'chemistry'),
    ('school-subjects', 'Biology',     'biology'),
    ('languages',       'English',     'english'),
    ('languages',       'Spanish',     'spanish'),
    ('languages',       'French',      'french'),
    ('languages',       'Arabic',      'arabic'),
    ('music',           'Piano',       'piano'),
    ('music',           'Guitar',      'guitar'),
    ('sports',          'Swimming',    'swimming'),
    ('sports',          'Tennis',      'tennis'),
    ('art',             'Drawing',     'drawing'),
    ('programming',     'Python',      'python'),
    ('programming',     'Web Development', 'web-development'),
    ('exam-preparation','SAT',         'sat'),
    ('exam-preparation','IELTS',       'ielts')
) AS s(cat, name, slug)
JOIN categories c ON c.slug = s.cat;
