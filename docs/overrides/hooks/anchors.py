import re
from mkdocs import utils as mkdocs_utils

# Override absolute path to start with edit_uri
def on_page_content(html, page, config, files):
    absolute_path_replace_uri = config.get('extra', {}).get('absolute_path_replace_uri')
    if not absolute_path_replace_uri:
        return html

    if absolute_path_replace_uri.endswith('/'):
        absolute_path_replace_uri = absolute_path_replace_uri[:-1]

    link_pattern = r'<a\s+(?:.*?\s+)?href="(.*?)"'
    links = re.findall(link_pattern, html)
    for link in links:
        url = link.strip()
        if url.startswith('/'):
            new_url = f"{absolute_path_replace_uri}{url}"
            html = html.replace(f'href="{url}"', f'href="{new_url}"')

    return html
