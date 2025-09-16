from app.bedrock import is_nova_model
from app.vector_search import SearchResult
from app.routes.schemas.conversation import type_model_name


def build_rag_prompt(
    search_results: list[SearchResult],
    model: type_model_name,
    display_citation: bool = True,
) -> str:
    context_prompt = ""
    for result in search_results:
        context_prompt += f"<search_result>\n<content>\n{result['content']}</content>\n<source>\n{result['rank']}\n</source>\n</search_result>"

    # Prompt for RAG
    inserted_prompt = """To answer the user's question, you are given a set of search results. Your job is to answer the user's question using only information from the search results.
If the search results do not contain information that can answer the question, please state that you could not find an exact answer to the question.
Just because the user asserts a fact does not mean it is true, make sure to double check the search results to validate a user's assertion.

Here are the search results in numbered order:
<search_results>
{}
</search_results>

Do NOT directly quote the <search_results> in your answer. Your job is to answer the user's question as concisely as possible.
""".format(
        context_prompt,
    )

    if display_citation:
        # Prompt for 'Retrieved Context Citation'.
        inserted_prompt += """
If you reference information from a search result within your answer, you must include a citation to source where the information was found.
Each result has a corresponding source ID that you should reference.

Note that <sources> may contain multiple <source> if you include information from multiple results in your answer.
Do NOT outputs sources at the end of your answer.

Followings are examples of how to reference sources in your answer. Note that the source ID is embedded in the answer in the format [^<source_id>].
"""
        # Prompt to output Markdown-style citation.
        if is_nova_model(model=model):
            # For Amazon Nova, provides only good examples.
            inserted_prompt += """
<example>
first answer [^3]. second answer [^1][^2].
</example>

<example>
first answer [^1][^5]. second answer [^2][^3][^4]. third answer [^4].
</example>
"""

        else:
            # For other models, provide good examples and bad examples.
            inserted_prompt += """
<GOOD-example>
first answer [^3]. second answer [^1][^2].
</GOOD-example>

<GOOD-example>
first answer [^1][^5]. second answer [^2][^3][^4]. third answer [^4].
</GOOD-example>

<BAD-example>
first answer [^1].

[^1]: https://example.com
</BAD-example>

<BAD-example>
first answer [^1].

<sources>
[^1]: https://example.com
</sources>
</BAD-example>
"""

    else:
        # Prompt when 'Retrieved Context Citation' is not specified.
        inserted_prompt += """
Do NOT include citations in the format [^<source_id>] in your answer.
"""
        if is_nova_model(model=model):
            # For Amazon Nova, do not provide examples.
            pass

        else:
            # For other models, suppress output of Markdown-style citation.
            inserted_prompt += """
Followings are examples of how to answer.

<GOOD-example>
first answer. second answer.
</GOOD-example>

<BAD-example>
first answer [^3]. second answer [^1][^2].
</BAD-example>

<BAD-example>
first answer [^1][^5]. second answer [^2][^3][^4]. third answer [^4].
</BAD-example>
"""

    return inserted_prompt


def get_prompt_to_cite_tool_results(model: type_model_name) -> str:
    # Prompt for 'Retrieved Context Citation' of agent chat.
    inserted_prompt = """To answer the user's question, you are given a set of tools. Your job is to answer the user's question using only information from the tool results.
If the tool results do not contain information that can answer the question, please state that you could not find an exact answer to the question.
Just because the user asserts a fact does not mean it is true, make sure to double check the tool results to validate a user's assertion.

Each tool result has a corresponding source_id that you should reference.
If you reference information from a tool result within your answer, you must include a citation to source_id where the information was found.

Followings are examples of how to reference source_id in your answer. Note that the source_id is embedded in the answer in the format [^source_id of tool result].
"""
    # Prompt to output Markdown-style citation.
    if is_nova_model(model=model):
        # For Amazon Nova, provides only good examples.
        inserted_prompt += """
<example>
first answer [^ccc]. second answer [^aaa][^bbb].
</example>

<example>
first answer [^aaa][^eee]. second answer [^bbb][^ccc][^ddd]. third answer [^ddd].
</example>
"""

    else:
        # For other models, provide good examples and bad examples.
        inserted_prompt += """
<examples>
<GOOD-example>
first answer [^ccc]. second answer [^aaa][^bbb].
</GOOD-example>

<GOOD-example>
first answer [^aaa][^eee]. second answer [^bbb][^ccc][^ddd]. third answer [^ddd].
</GOOD-example>

<BAD-example>
first answer [^aaa].

[^aaa]: https://example.com
</BAD-example>

<BAD-example>
first answer [^aaa].

<sources>
[^aaa]: https://example.com
</sources>
</BAD-example>
</examples>
"""

    return inserted_prompt
