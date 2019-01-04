var COUNTER_THRESHOLD = 0;
// Isnturctable config times
var INSTRUCTABLE_DELAY_TIME = 2000;
var INSTRUCTABLE_FADE_TIME = 600;
var MOBILE = Modernizr.touch;
var SMALL = Modernizr.mq('only all and (max-width: 480px)');
var iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

var $body;
var $content;
var $books_grid;
var $all_tags;
var $tags = {};
var $clear_tags;
var $current_tag;
var $modal;
var $modal_content;
var $books_list;
var $back_to_top;
var $mobile_filters_btn;
var $filter;
var $toggle_text;
var $show_text_button;
var $show_books_button;
var $review;
var $first;
var $last;
var $share_modal;
var $large_ad;
var $header;

var next;
var previous;
var selected_tags = [];
var first_hash = true;
var noRepeat = false;

var startTouch;
var completion = 1;
var swipeTolerance = 80;
var touchFactor = 1;
var swipeDetected = null;

var bodyPosition = 0;

/*
 * Scroll to a given element.
 */
var scroll_to = function($el) {
    var top = $el.offset().top;
    $body.scrollTop(top);
};

/*
 * Jump back to the top of the page.
 */
var back_to_top = function() {
    $body.scrollTo($content, { duration:450 }, 'y');
    return false;
};

/*
 * Enable or reapply isotope to the grid.
 */
var isotope_grid = function(filter) {
    $books_grid.isotope({
        filter: filter,
        transitionDuration: (!MOBILE) ? '0.4s' : 0,
        getSortData: {
            'id': function(el) {
                return parseInt($(el).data('sort'), 10);
            }
        },
        sortBy: 'id'
    });
};

/*
 * Show/hide books in the grid.
 */
var filter_books = function() {
    $all_tags.parent().removeClass('selected unavailable');
    $all_tags.removeClass('selected unavailable');

    selected_tags.sort();

    if (selected_tags.length > 0) {
        var filter = '';
        var label = [];

        // Update selected tags
        for (var i in selected_tags) {
            var slug = selected_tags[i];
            $tag = $tags[slug];

            $tag.addClass('selected');
            $tag.parent().addClass('selected');
            filter += '.tag-' + slug;
            label.push(COPY.tags[slug]);
        }

        label = label.join(', ');

        // Replicate isotope filtering so that we can update
        // available tags without waiting for isotope to do its thing
        var remaining_books = _.filter(BOOKS, function(book) {
            for (var i in selected_tags) {
                var slug = selected_tags[i];

                if (_.indexOf(book.tags, slug) == -1) {
                    return false;
                }
            }

            return true;
        });

        // Hide empty tags
        for (var tag_slug in COPY.tags) {
            var has_results = false;

            for (var z = 0; z < remaining_books.length; z++) {
                var book = remaining_books[z];

                if (_.indexOf(book.tags, tag_slug) >= 0) {
                    has_results = true;
                    break;
                }
            }

            if (!has_results) {
                $tag = $tags[tag_slug];
                $tag.parent().addClass('unavailable');
                $tag.addClass('unavailable');
            }
        }

        $clear_tags.removeClass('hide');
        var text = 'Libros etiquetados como ';
        $current_tag.find('#showing-span').text(text);
        if (remaining_books.length >= COUNTER_THRESHOLD) {
            label += ' (' + remaining_books.length + ')';
        }
        $current_tag.find('#tag-span').text(label);
        $books_grid.removeClass('filter-inactive');

        filter_books_list(filter);
        _.defer(isotope_grid, filter);

    } else {

        $clear_tags.addClass('hide');
        var text = 'Todos los libros ('+BOOKS.length+')';
        $current_tag.find('#showing-span').text(text);
        $current_tag.find('#tag-span').text('');
        $books_grid.addClass('filter-inactive');

        filter_books_list(null);
        _.defer(isotope_grid, '*');
    }

    // NB: Force scroll event so that unveils will happen auto-magically.
    // We wait a moment first so the grid has animated in.
    _.delay(function() {
        $(window).trigger('scroll');
    }, 1000);
};

/*
 * Filter the text book list.
 */
var filter_books_list = function(filter) {
    if (filter) {
        $books_list.find('li').removeClass('visible');

        filter = '';

        for (var i in selected_tags) {
            var slug = selected_tags[i];
            filter += '.tag-' + slug;
        }

        $books_list.find(filter).addClass('visible');
    } else {
        $books_list.find('li').addClass('visible');
    }
};

/*
 * Filter the list to a certain tag.
 */
var on_tag_clicked = function() {
    var slug = $(this).data('tag-slug');
    var already_selected = selected_tags.indexOf(slug);

    if (already_selected >= 0) {
        selected_tags.splice(already_selected, 1);
    } else {
        selected_tags.push(slug);
    }

    if (selected_tags.length > 0) {
        hasher.setHash('tag', selected_tags.join(','));
    } else {
        hasher.setHash('_');
    }

    toggle_filter_modal();
    return false;
};

/*
* Handles transitions related to scrolling.
*/
var on_page_scroll = function() {
    var y_scroll_pos = window.pageYOffset;
    var scroll_pos_test = 1200;

    if(y_scroll_pos > scroll_pos_test && $('#myModal:visible').length === 0) {
        $back_to_top.fadeIn(1000);
    } else {
        $back_to_top.fadeOut(400);
    }
};

/*
* Handles tag clicks on modal.
*/

var on_modal_tag_clicked = function() {
    back_to_top();
    return true;
};

/*
 * Clear the current tag
 */
var on_clear_tags_clicked = function() {
    hasher.setHash('_');
    ANALYTICS.trackEvent('clear-tags');
    return false;
};

/*
 * New tag hash url.
 */
var on_tag_hash = function(tags) {
    selected_tags = tags.split(',');
    filter_books();
};

/*
 * New book hash url and previous/next buttons.
 */
var on_book_hash = function(slug) {
    bookPos = window.pageYOffset;
    if (bookPos !== 0){
      bodyPosition = bookPos;
    }

    // Get rid of the old modal.
    // They smell so musty.
    $modal_content.empty();

    // Find this book from the list.
    book = _.find(BOOKS, function(book){
        return book['slug'] == slug;
    });

    // Set up a variable to represent this book in the grid.
    // It's null because we have TWO DIFFERENT GRIDS AAAAAAA.
    var grid_item;

    // This next/prev list is sorted two different ways.
    // The first way it can be sorted is for the grid view.
    // This time, we're checking for if the $books_grid is visible.
    if ($books_grid.is(':visible')) {

        // The grid item is an id of the book slug.
        grid_item = $('#' + book.slug);

        if ($books_grid.hasClass('filter-inactive')) {
            // Next and previous are based on whole list of books.
            next = grid_item.next();
            previous = grid_item.prev();
            $first = $books_grid.find('.book').first();
            $last = $books_grid.find('.book').last();
        } else {
            // Next and previous are based on hidden/not hidden isotope elements.
            next = grid_item.nextAll(':visible').first();
            previous = grid_item.prevAll(':visible').first();
            $first = $books_grid.find('.book:visible').first();
            $last = $books_grid.find('.book:visible').last();
        }


        // And the buttons fetch the ID of the next element.
        if (next.length === 0) {
            next = $first.attr('id');
        } else {
            next = next.attr('id');
        }
        if (previous.length === 0) {
            previous = $last.attr('id');
        } else {
            previous = previous.attr('id');
        }

    } else {

        // The grid item in the second case is the anchor with the slug as it's class.
        grid_item = $('li.' + book.slug);

        // Next and previous are based whether these items are visible.
        next = grid_item.nextAll(':visible').first();
        previous = grid_item.prevAll(':visible').first();
        $first = $books_list.find('li:visible').first();
        $last = $books_list.find('li:visible').last();


        // And the buttons fetch the data-slug attribute of the next element.
        if (next.length === 0) {
            next = $first.attr('data-slug');
        } else {
            next = next.attr('data-slug');
        }
        if (previous.length === 0) {
            previous = $last.attr('data-slug');
        } else {
            previous = previous.attr('data-slug');
        }
    }

    // Now, go about our normal business of building the modal.
    $modal_content.append(JST.book_modal({
        book: book,
        next: next,
        previous: previous,
        MOBILE: (MOBILE)
    }));
    $modal.scrollTop(0); // #174.
    // Modals should be modaled whenever modalable.
    $modal.modal();

    $('.instructable').delay(INSTRUCTABLE_DELAY_TIME).fadeOut(INSTRUCTABLE_FADE_TIME);
    noRepeat = true;

    // And hide the "back to the top" button.
    $back_to_top.hide();
};

/*
 * Respond to url changes.
 */
var on_hash_changed = function(new_hash, old_hash) {
    var bits = new_hash.split('/');
    var hash_type = bits[0];
    var hash_slug = bits[1];

    // Track _ the same as root
    if (new_hash == '_') {
        new_hash = '';
    }

    if (hash_type == 'tag') {
        $modal.modal('hide');
        on_tag_hash(hash_slug);
        selected_tags.sort();
        ANALYTICS.trackEvent('selected-tags', selected_tags.join(','));
    } else if (hash_type == 'book') {
        on_book_hash(hash_slug);
        $modal.show().css('overflow-y','hidden').scrollTop(0).css('overflow-y','scroll');

        if (new_hash != '') {
            ANALYTICS.trackEvent('view-review', hash_slug);
        }

        // On first load, we need to load in the books. #142
        if (first_hash) {
            filter_books();
        }
    } else {
        $modal.modal('hide');
        selected_tags = [];
        filter_books();
    }

    if (selected_tags.length > 0) {
        $mobile_filters_btn.text('Agregar un filtro');
    } else {
        $mobile_filters_btn.text('Filtrar por tema');
    }

    first_hash = false;

    return false;
};

/*
 * Clear the hash when closing a book modal.
 */
var on_book_modal_closed = function() {
    if (selected_tags.length > 0) {
        hasher.setHash('tag', selected_tags.join(','));
    } else {
        /*
         * CEG: Don't set to empty string or it will turn into '#' which
         * will cause a scroll to top of page that we don't want when
         * closing the modal.
         */
        hasher.setHash('_');

        $('body').scrollTo(bodyPosition, { duration:1000 });
    }

    return true;

};

// Never relayout the grid more than twice a second
var relayout = _.throttle(function() {
    $books_grid.isotope('layout');
}, 500);


/*
 * Begin unveiling visible books in the grid.
 */
var unveil_grid = function() {
    $books_grid.find('img').unveil(500, function() {
        $(this).imagesLoaded(function() {
            relayout();
        });
    });
};

/*
 * Show and hide the filters on small screens
 */
var toggle_filter_modal = function() {
    $filter.toggleClass('hidden-xs').scrollTop(0);
};

/*
 * Toggle the text books list.
 */
var toggle_books_list = function() {
    $books_grid.toggle();
    $books_list.toggle();
    $toggle_text.toggleClass('grid-active list-active');

    if ($books_grid.is(':visible')) {
        ANALYTICS.trackEvent('toggle-view', 'grid');
        filter_books();
    } else {
        ANALYTICS.trackEvent('toggle-view', 'list');
    }
};

var setupClipboardjs = function() {
    var clipboard = new Clipboard('.clippy');
    clipboard.on('success', function(e) {
        e.clearSelection();
        $(e.trigger).tooltip('show');
        setTimeout(hideTooltip, 1000);
        ANALYTICS.trackEvent('summary-copied');
        function hideTooltip() {
            $(e.trigger).tooltip('hide');
        }
    });
    clipboard.on('error', function(e) {
        console.log('Your browser does not support execCommand. Press Ctrl/Cmd+C to copy');
        $(e.trigger).attr('data-original-title','Press Ctrl/Cmd+C to copy');
        $(e.trigger).tooltip('show');
        setTimeout(hideTooltip, 1000);
        ANALYTICS.trackEvent('summary-copied');
        function hideTooltip() {
            $(e.trigger).tooltip('hide');
        }
    });
}

var on_next = function() {
    ANALYTICS.trackEvent('navigate', 'next');
}

var on_previous = function() {
    ANALYTICS.trackEvent('navigate', 'previous');
}

var on_keypress = function (e) {
    if ($('#myModal:visible').length > 0){
        if (e.which === 37 && previous !== null) {
            on_previous();
            hasher.setHash('book', previous);
        } else if (e.which === 39 && next !== null) {
            on_next();
            hasher.setHash('book', next);
        }
    }
}

var on_show_share = function() {
    ANALYTICS.trackEvent('open-share-discuss');
}

var on_hide_share = function() {
    ANALYTICS.trackEvent('close-share-discuss');
}

var resize = function() {
    var height = $header.outerHeight();
    $large_ad.height(height);
}

$(function() {
 console.log('get data');
 var api_url = [window.API_URL, "/", window.PROJECT_SLUG].join("");
 $.get(api_url, function(data) {
    console.log('get data done');
    window.BOOKS = data;
    init();
  });
});

function init() {
    // Set up the global variables.
    $body = $('body');
    $content = $('#content');
    $books_grid = $('#books-grid');
    $all_tags = $('.tags .tag');
    $clear_tags = $('.clear-tags');
    $current_tag = $('.current-tag');
    $modal = $('#myModal');
    $modal_content = $('#myModal .modal-content');
    $books_list = $('#books-list');
    $back_to_top = $('#back-to-top');
    $mobile_filters_btn = $('#mobile-filters');
    $filter = $('.filter.tags');
    $show_text_button = $('.show-text');
    $show_books_button = $('.show-books');
    $toggle_text = $('.toggle-text');
    $review = $('.review');
    $share_modal = $('#share-modal');
    $large_ad = $('#largeVersion');
    $header = $('#top');
    window.BOOKS = _.shuffle(window.BOOKS);
    _.each(window.BOOKS, function(book, i) {
        var book_grid_content = window.JST["book_grid_item"]({
            book: book,
            loop_index: i
        });
        $books_grid.append(book_grid_content);
    });

    window.BOOKS_SORTED = _.sortBy(_.map(window.BOOKS, function(book) {
        if (book.title.slice(0, 4).toLowerCase() === 'the ') {
            book.sort_title = book.title.slice(4, book.title.length);
        } else if (book.title.slice(0, 2).toLowerCase() == 'a ') {
            book.sort_title = book.title.slice(2, book.title.length);
        } else {
            book.sort_title = book.title
        }
        return book;
    }), 'sort_title');
    _.each(window.BOOKS_SORTED, function(book, i) {
        var book_list_content = window.JST["book_list_item"]({
            book: book,
            loop_index: i
        });
        $books_list.append(book_list_content);
    });

    // Event handlers.
    $body.on('click', '.filter .tag', on_tag_clicked);
    $content.on('click', '.back-to-top', back_to_top);
    $content.on('click', 'button.clear-tags', on_clear_tags_clicked);
    $modal.on('hidden.bs.modal', on_book_modal_closed);
    $modal.on('click', '.tag', on_modal_tag_clicked);
    $back_to_top.on('click', back_to_top);
    $mobile_filters_btn.on('click', toggle_filter_modal);
    $filter.find('.close-modal').on('click', toggle_filter_modal);
    $toggle_text.on('click', toggle_books_list);
    $(window).on('scroll', on_page_scroll);
    $modal.keyup(on_keypress);
    $modal.on('click', '#previous-book', on_previous);
    $modal.on('click', '#next-book', on_next);
    $share_modal.on('shown.bs.modal', on_show_share);
    $share_modal.on('hidden.bs.modal', on_hide_share);
    $(window).on('resize', resize);
    $(document).scroll(function(){
      checkOffset();
    });
    if (MOBILE){
      console.log('Touch Screen Detected');
      $body.on('touchstart', onTouchStart);
      $body.on('touchmove', onTouchMove);
      $body.on('touchend', onTouchEnd);
      $(".review").addClass('noHover');
      // Add touch class to body
      $body.addClass('touch');
    }
    if (iOS){
      $("#summary-text").addClass('iosText');
    }

    // Set up the page.
    resize();
    $back_to_top.hide();
    $current_tag.find('#showing-span').text('Todos los libros');
    $current_tag.show();
    _.each($all_tags, function(tag) {
        var $tag = $(tag);
        $tags[$tag.data('tag-slug')] = $tag;
    });

    // add Clipboard for deeplinks
    $('[data-toggle="tooltip"]').tooltip();
    setupClipboardjs();

    // Set up the hasher bits to grab the URL hash.
    hasher.changed.add(on_hash_changed);
    hasher.initialized.add(on_hash_changed);
    hasher.init();

    // Set up the grid.
    _.delay(unveil_grid, 0);
};


function checkOffset(){
  if ($(window).width() <= 640){
    var scrollBottom = $(document).height() - $(window).height() - $(window).scrollTop();

    if (scrollBottom <= $('#footer').height() + 10){
       var spaceDiff = ($('#footer').height() + 10) - scrollBottom;
       $('#back-to-top').css({'bottom':spaceDiff});
    } else {
      $('#back-to-top').css({'bottom':'0'});
    }
  } else {
    $('#back-to-top').css({'bottom':'100'});
  }
  
}

var onTouchStart = function(e) {
  if ($body.hasClass('modal-open')){
    /*
     * Capture start position when swipe initiated
     */
    $('.instructable').hide();
    noRepeat = true;
    if (!startTouch) {
        startTouch = $.extend({}, e.originalEvent.targetTouches[0]);
    }
  };
}

var onTouchMove = function(e) {
    /*
     * Track finger swipe
     */

  if ($body.hasClass('modal-open')){
    $.each(e.originalEvent.changedTouches, function(i, touch) {
        if (!startTouch || touch.identifier !== startTouch.identifier) {
            return true;
        }
        var yDistance = touch.screenY - startTouch.screenY;
        var xDistance = touch.screenX - startTouch.screenX;
        var direction = (xDistance > 0) ? 'right' : 'left';

        if (Math.abs(yDistance) < Math.abs(xDistance)) {
            e.preventDefault();
        }

        if (Math.abs(xDistance) > swipeTolerance) {
            if (!swipeDetected) {
                console.log('initialize swipeDetected to the: ', direction);
                swipeDetected = direction;
            }
        }
    });
  };
}

var onTouchEnd = function(e) {
    /*
     * Clear swipe start position when swipe ends
     */
    if ($body.hasClass('modal-open')){
        $.each(e.originalEvent.changedTouches, function(i, touch) {
            if (startTouch && touch.identifier === startTouch.identifier) {
                startTouch = undefined;
            }
        });
        if (swipeDetected) {
            if (swipeDetected === 'right' && previous) {
                console.log('Swipe Right detected navigate to previous')
                on_previous();
                hasher.setHash('book', previous);
            } else if (swipeDetected === 'left' && next){
                console.log('Swipe Left detected navigate to next')
                on_next();
                hasher.setHash('book', next);
            }
            swipeDetected = null;
        }
    }
}

// var instructEm = function(){
//     $('.instructable').fadeTo('slow', 1);
//     $('.instructable').addClass('dontRepeat');
// };
