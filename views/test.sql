SELECT stories.id, stories.created_user_id, users.username AS created_username, stories.title, stories.starting_paragraph_id, starting_paragraphs.paragraph AS starting_paragraph, stories.ending_paragraph_id, ending_paragraphs.paragraph AS ending_paragraph, collaborators_stories.keyword1_id, collaborators_stories.keyword2_id, collaborators_stories.keyword3_id FROM stories INNER JOIN starting_paragraphs ON stories.starting_paragraph_id = starting_paragraphs.id INNER JOIN ending_paragraphs ON stories.ending_paragraph_id = ending_paragraphs.id INNER JOIN users ON stories.created_user_id = users.id INNER JOIN collaborators_stories ON collaborators_stories.story_id = stories.id WHERE stories.id=2 AND collaborators_stories.collaborator_id=10;

INNER JOIN keywords AS keyword1 ON collaborators_stories.keyword1_id = keyword1.id INNER JOIN keywords AS keyword2 ON collaborators_stories.keyword2_id = keyword2.id INNER JOIN keywords AS keyword3 ON collaborators_stories.keyword3_id = keyword3.id 