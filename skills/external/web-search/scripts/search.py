#!/usr/bin/env python3
"""
OpenOBA web-search SKILL — DuckDuckGo 搜索脚本
用法: python search.py --query "关键词" --format json --max-results 10

依赖: pip install duckduckgo-search
"""

import argparse
import json
import sys
import traceback

try:
    from duckduckgo_search import DDGS
except ImportError:
    print(json.dumps({
        "error": "缺少依赖: pip install duckduckgo-search",
        "results": [],
    }))
    sys.exit(0)


def search_web(query: str, max_results: int = 10, time_range: str = "w",
               country: str = "", language: str = ""):
    """DuckDuckGo 网页搜索"""
    results = []
    kwargs = {"region": "wt-wt", "safesearch": "moderate", "timelimit": time_range}
    
    # 过滤无效参数
    kwargs = {k: v for k, v in kwargs.items() if v}
    
    with DDGS() as ddgs:
        for r in ddgs.text(query, max_results=max_results):
            results.append({
                "title": r.get("title", ""),
                "url": r.get("href", ""),
                "body": r.get("body", ""),
            })
    return results


def search_news(query: str, max_results: int = 10, time_range: str = "w",
                country: str = "", language: str = ""):
    """DuckDuckGo 新闻搜索"""
    results = []
    kwargs = {"region": "wt-wt", "safesearch": "moderate", "timelimit": time_range}
    kwargs = {k: v for k, v in kwargs.items() if v}
    
    with DDGS() as ddgs:
        for r in ddgs.news(query, max_results=max_results):
            results.append({
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "body": r.get("body", ""),
                "date": r.get("date", ""),
                "source": r.get("source", ""),
            })
    return results


def search_images(query: str, max_results: int = 10, time_range: str = "w",
                  country: str = "", language: str = ""):
    """DuckDuckGo 图片搜索"""
    results = []
    kwargs = {"region": "wt-wt", "safesearch": "moderate"}
    kwargs = {k: v for k, v in kwargs.items() if v}
    
    with DDGS() as ddgs:
        for r in ddgs.images(query, max_results=max_results):
            results.append({
                "title": r.get("title", ""),
                "url": r.get("image", ""),
                "thumbnail": r.get("thumbnail", ""),
                "source": r.get("url", ""),
            })
    return results


def search_videos(query: str, max_results: int = 10, time_range: str = "w",
                  country: str = "", language: str = ""):
    """DuckDuckGo 视频搜索"""
    results = []
    kwargs = {"region": "wt-wt", "safesearch": "moderate"}
    kwargs = {k: v for k, v in kwargs.items() if v}
    
    with DDGS() as ddgs:
        for r in ddgs.videos(query, max_results=max_results):
            results.append({
                "title": r.get("title", ""),
                "url": r.get("content", ""),
                "description": r.get("description", ""),
                "thumbnail": r.get("images", {}).get("medium", "") if r.get("images") else "",
                "duration": r.get("duration", ""),
                "source": r.get("publisher", ""),
            })
    return results


SEARCH_HANDLERS = {
    "web": search_web,
    "news": search_news,
    "images": search_images,
    "videos": search_videos,
}


def main():
    parser = argparse.ArgumentParser(description="OpenOBA DuckDuckGo 搜索")
    parser.add_argument("--query", required=True, help="搜索关键词")
    parser.add_argument("--type", default="web", choices=["web", "news", "images", "videos"], help="搜索类型")
    parser.add_argument("--max-results", type=int, default=10, help="最大结果数")
    parser.add_argument("--time", default="w", choices=["d", "w", "m", "y"], help="时间范围")
    parser.add_argument("--country", default="", help="地区代码")
    parser.add_argument("--language", default="", help="语言代码")
    parser.add_argument("--format", default="json", choices=["json"], help="输出格式")

    args = parser.parse_args()

    handler = SEARCH_HANDLERS.get(args.type, search_web)
    try:
        results = handler(
            query=args.query,
            max_results=min(args.max_results, 20),
            time_range=args.time,
            country=args.country,
            language=args.language,
        )
        print(json.dumps({"results": results, "query": args.query, "type": args.type, "source": "duckduckgo"}, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e), "results": [], "traceback": traceback.format_exc()}, ensure_ascii=False))


if __name__ == "__main__":
    main()
